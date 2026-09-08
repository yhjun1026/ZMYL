/**
 * 可配置审批流管理 —— 对齐数据包 app.py /api/approval-flows 系列接口
 *
 * 生命周期：draft --提交--> pending --质量负责人通过--> active
 *                      +--驳回--> rejected（可改后重新提交）
 *           active --停用--> disabled / --被新版本取代--> archived
 * 只有 active + is_current 的流程会驱动业务单据流转（见 utils/flowEngine）
 */
const db = require('../db');
const { success, fail, parseJSON } = require('../utils/response');
const auditLog = require('../utils/audit');
const { FLOW_HOOKS, BIZ_MODULES, getActiveFlow, getFlowStep, logFlowAction } = require('../utils/flowEngine');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
}
function displayName(req) {
  return req.user.name || req.user.username;
}

const STATUS_NAME = {
  draft: '草稿', pending: '待质量负责人审批', active: '已生效',
  rejected: '已驳回', disabled: '已停用', archived: '历史版本',
};

function flowToDict(f, steps) {
  return {
    ...f,
    status_name: STATUS_NAME[f.status] || f.status,
    can_edit: ['draft', 'rejected'].includes(f.status),
    can_submit: ['draft', 'rejected'].includes(f.status),
    steps: steps === undefined ? undefined : steps.map(stepToDict),
  };
}

function stepToDict(s) {
  return {
    ...s,
    approver_user_ids: parseJSON(s.approver_user_ids, []) || [],
    cc_roles: parseJSON(s.cc_roles, []) || [],
    reject_action_name: { to_prev: '退回上一步', to_start: '退回发起人', terminate: '终止流程' }[s.reject_action] || s.reject_action,
  };
}

/** GET /api/approval-flows/meta —— 业务模块选项 + 角色选项 + 状态字典 */
async function meta(req, res) {
  const roles = await db.all('SELECT code, name FROM roles ORDER BY id');
  return res.json(success({
    biz_modules: BIZ_MODULES,
    roles: roles.map((r) => ({ code: r.code, name: r.name })),
    status_name: STATUS_NAME,
    reject_actions: [
      { code: 'to_prev', name: '退回上一步' },
      { code: 'to_start', name: '退回发起人' },
      { code: 'terminate', name: '终止流程' },
    ],
  }));
}

/** GET /api/approval-flows?status=&biz_module=&keyword= */
async function list(req, res) {
  const { status = '', biz_module = '', keyword = '' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (biz_module) { where.push('biz_module = ?'); params.push(biz_module); }
  if (keyword) { where.push('(flow_code LIKE ? OR flow_name LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }
  const rows = await db.all(
    `SELECT * FROM approval_flow WHERE ${where.join(' AND ')} ORDER BY updated_at DESC, id DESC`,
    params
  );
  // 附带步骤数
  for (const f of rows) {
    const c = await db.get('SELECT COUNT(*) AS c FROM approval_flow_step WHERE flow_id = ? AND deleted = 0', [f.id]);
    f.step_count = c ? c.c : 0;
  }
  return res.json(success({ list: rows.map((f) => flowToDict(f)), total: rows.length }));
}

/** GET /api/approval-flows/:id（含步骤） */
async function getOne(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  const steps = await db.all(
    'SELECT * FROM approval_flow_step WHERE flow_id = ? AND deleted = 0 ORDER BY step_no', [flow.id]
  );
  return res.json(success(flowToDict(flow, steps)));
}

/** POST /api/approval-flows  body: { flow_code, flow_name, biz_module, description, steps: [...] } */
async function create(req, res) {
  const b = req.body || {};
  if (!b.flow_code || !b.flow_name) return res.status(400).json(fail('流程编码与名称必填', 400));
  const dup = await db.get('SELECT id FROM approval_flow WHERE flow_code = ? AND deleted = 0 LIMIT 1', [b.flow_code]);
  if (dup) return res.status(400).json(fail(`流程编码 ${b.flow_code} 已存在，如需修改请对该流程新建版本`, 400));

  const biz = BIZ_MODULES.find((m) => m.id === b.biz_module);
  const steps = Array.isArray(b.steps) ? b.steps : [];

  const flowId = await db.transaction((tx) => {
    const info = tx.run(
      `INSERT INTO approval_flow (flow_code, flow_name, biz_module, biz_module_name, version, is_current,
         status, description, created_by, created_by_id)
       VALUES (?, ?, ?, ?, 1, 0, 'draft', ?, ?, ?)`,
      [b.flow_code, b.flow_name, b.biz_module || '', biz ? biz.name : (b.biz_module_name || ''),
        b.description || '', displayName(req), req.userId]
    );
    insertSteps(tx, info.insertId, steps);
    return info.insertId;
  });

  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ?', [flowId]);
  await logFlowAction(flow, 'create', '', 'draft', '', req);
  auditLog('FLOW_CREATE', req.userId, `approval_flow#${flowId}`, { flow_code: b.flow_code });
  return res.status(201).json(success({ id: flowId }, '审批流程创建成功（草稿），请提交质量负责人审批后生效'));
}

function insertSteps(tx, flowId, steps) {
  steps.forEach((s, i) => {
    tx.run(
      `INSERT INTO approval_flow_step
        (flow_id, step_no, step_name, step_code, approver_role, approver_role_name, approver_user_ids,
         is_required, can_reject, reject_action, allow_transfer, timeout_days, auto_approve_same, cc_roles, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [flowId, s.step_no || i + 1, s.step_name || `步骤${i + 1}`, s.step_code || '',
        s.approver_role || '', s.approver_role_name || '',
        JSON.stringify(Array.isArray(s.approver_user_ids) ? s.approver_user_ids : []),
        s.is_required === false ? 0 : 1, s.can_reject === false ? 0 : 1,
        s.reject_action || 'to_prev', s.allow_transfer ? 1 : 0, s.timeout_days || 0,
        s.auto_approve_same ? 1 : 0, JSON.stringify(Array.isArray(s.cc_roles) ? s.cc_roles : []),
        s.description || '']
    );
  });
}

/** PUT /api/approval-flows/:id（仅草稿/已驳回可编辑） */
async function update(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  if (!['draft', 'rejected'].includes(flow.status)) {
    return res.status(400).json(fail(`仅草稿/已驳回状态可编辑（当前: ${STATUS_NAME[flow.status]}），已生效流程请新建版本`, 400));
  }
  const b = req.body || {};
  const biz = BIZ_MODULES.find((m) => m.id === (b.biz_module || flow.biz_module));

  await db.transaction((tx) => {
    tx.run(
      `UPDATE approval_flow SET flow_name = ?, biz_module = ?, biz_module_name = ?, description = ?,
         updated_at = datetime('now','localtime') WHERE id = ?`,
      [b.flow_name || flow.flow_name, b.biz_module || flow.biz_module,
        biz ? biz.name : flow.biz_module_name, b.description !== undefined ? b.description : flow.description, flow.id]
    );
    if (Array.isArray(b.steps)) {
      tx.run('UPDATE approval_flow_step SET deleted = 1 WHERE flow_id = ?', [flow.id]);
      tx.run('DELETE FROM approval_flow_step WHERE flow_id = ?', [flow.id]);
      insertSteps(tx, flow.id, b.steps);
    }
  });

  await logFlowAction(flow, 'update', flow.status, flow.status, '', req);
  auditLog('FLOW_UPDATE', req.userId, `approval_flow#${flow.id}`, {});
  return res.json(success(null, '流程已更新'));
}

/** DELETE /api/approval-flows/:id（仅草稿/已驳回/已停用可删） */
async function remove(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  if (['active', 'pending'].includes(flow.status)) {
    return res.status(400).json(fail(`${STATUS_NAME[flow.status]}状态的流程不可删除（请先停用/撤回）`, 400));
  }
  await db.run('UPDATE approval_flow SET deleted = 1 WHERE id = ?', [flow.id]);
  await logFlowAction(flow, 'delete', flow.status, 'deleted', '', req);
  auditLog('FLOW_DELETE', req.userId, `approval_flow#${flow.id}`, { flow_code: flow.flow_code });
  return res.json(success(null, '流程已删除'));
}

/** POST /api/approval-flows/:id/submit —— draft/rejected -> pending */
async function submit(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  if (!['draft', 'rejected'].includes(flow.status)) {
    return res.status(400).json(fail(`当前状态「${STATUS_NAME[flow.status]}」不可提交`, 400));
  }
  const c = await db.get('SELECT COUNT(*) AS c FROM approval_flow_step WHERE flow_id = ? AND deleted = 0', [flow.id]);
  if (!c || c.c === 0) return res.status(400).json(fail('流程未配置任何步骤，无法提交', 400));

  const user = displayName(req);
  await db.run(
    `UPDATE approval_flow SET status = 'pending', submitted_by = ?, submitted_by_id = ?, submitted_at = ?,
       updated_at = datetime('now','localtime') WHERE id = ?`,
    [user, req.userId, nowStr(), flow.id]
  );
  await logFlowAction(flow, 'submit', flow.status, 'pending', '', req);
  auditLog('FLOW_SUBMIT', req.userId, `approval_flow#${flow.id}`, {});
  return res.json(success({ status: 'pending' }, '已提交质量负责人审批'));
}

/** POST /api/approval-flows/:id/approve  body: { action: 'approve'|'reject', opinion } —— 质量负责人审批 */
async function approve(req, res) {
  if (!['sys_admin', 'quality_mgr'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需质量负责人）', 403));
  }
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  if (flow.status !== 'pending') {
    return res.status(400).json(fail(`当前状态「${STATUS_NAME[flow.status]}」不可审批`, 400));
  }
  const { action = 'approve', opinion = '' } = req.body || {};
  const user = displayName(req);

  if (action === 'approve') {
    await db.transaction((tx) => {
      // 同 flow_code 的其它版本全部归档（当前生效的被取代）
      tx.run(
        `UPDATE approval_flow SET status = 'archived', is_current = 0, updated_at = datetime('now','localtime')
          WHERE flow_code = ? AND id != ? AND status = 'active' AND deleted = 0`,
        [flow.flow_code, flow.id]
      );
      tx.run(
        `UPDATE approval_flow SET status = 'active', is_current = 1, effective_at = ?,
           approved_by = ?, approved_by_id = ?, approved_at = ?, approve_opinion = ?,
           updated_at = datetime('now','localtime') WHERE id = ?`,
        [nowStr(), user, req.userId, nowStr(), opinion || '同意', flow.id]
      );
    });
  } else {
    await db.run(
      `UPDATE approval_flow SET status = 'rejected', approved_by = ?, approved_by_id = ?, approved_at = ?,
         approve_opinion = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [user, req.userId, nowStr(), opinion || '驳回', flow.id]
    );
  }

  await logFlowAction(flow, action === 'approve' ? 'approve' : 'reject', 'pending',
    action === 'approve' ? 'active' : 'rejected', opinion, req);
  auditLog('FLOW_APPROVE', req.userId, `approval_flow#${flow.id}`, { action });
  return res.json(success(
    { status: action === 'approve' ? 'active' : 'rejected' },
    action === 'approve' ? '流程已生效，即刻驱动业务单据审批' : '已驳回，提交人可修改后重新提交'
  ));
}

/** POST /api/approval-flows/:id/disable —— active -> disabled */
async function disable(req, res) {
  if (!['sys_admin', 'quality_mgr'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需质量负责人）', 403));
  }
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  if (flow.status !== 'active') return res.status(400).json(fail('仅已生效流程可停用', 400));

  await db.run(
    `UPDATE approval_flow SET status = 'disabled', is_current = 0, updated_at = datetime('now','localtime') WHERE id = ?`,
    [flow.id]
  );
  await logFlowAction(flow, 'disable', 'active', 'disabled', (req.body || {}).opinion || '', req);
  auditLog('FLOW_DISABLE', req.userId, `approval_flow#${flow.id}`, {});
  return res.json(success({ status: 'disabled' }, '流程已停用，相关业务模块回退到默认审批规则'));
}

/** POST /api/approval-flows/:id/new-version —— 基于现有流程生成新版本草稿（version+1） */
async function newVersion(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  const maxV = await db.get('SELECT MAX(version) AS v FROM approval_flow WHERE flow_code = ? AND deleted = 0', [flow.flow_code]);
  const nextV = (maxV && maxV.v ? maxV.v : flow.version) + 1;

  const newId = await db.transaction((tx) => {
    const info = tx.run(
      `INSERT INTO approval_flow (flow_code, flow_name, biz_module, biz_module_name, version, is_current,
         status, description, created_by, created_by_id)
       VALUES (?, ?, ?, ?, ?, 0, 'draft', ?, ?, ?)`,
      [flow.flow_code, flow.flow_name, flow.biz_module, flow.biz_module_name, nextV,
        flow.description, displayName(req), req.userId]
    );
    const steps = tx.all('SELECT * FROM approval_flow_step WHERE flow_id = ? AND deleted = 0 ORDER BY step_no', [flow.id]);
    insertSteps(tx, info.insertId, steps.map((s) => ({
      ...s,
      approver_user_ids: parseJSON(s.approver_user_ids, []) || [],
      cc_roles: parseJSON(s.cc_roles, []) || [],
      is_required: !!s.is_required, can_reject: !!s.can_reject,
    })));
    return info.insertId;
  });

  const nf = await db.get('SELECT * FROM approval_flow WHERE id = ?', [newId]);
  await logFlowAction(nf, 'create', '', 'draft', `基于 v${flow.version} 新建版本`, req);
  auditLog('FLOW_NEW_VERSION', req.userId, `approval_flow#${newId}`, { from: flow.id, version: nextV });
  return res.status(201).json(success({ id: newId, version: nextV }, `已生成 v${nextV} 草稿，提交审批通过后自动取代当前版本`));
}

/** GET /api/approval-flows/pending —— 待我（质量负责人）审批的流程 */
async function pending(req, res) {
  const rows = await db.all(
    `SELECT * FROM approval_flow WHERE status = 'pending' AND deleted = 0 ORDER BY submitted_at DESC`
  );
  return res.json(success({ list: rows.map((f) => flowToDict(f)), total: rows.length }));
}

/** GET /api/approval-flows/active —— 各业务模块当前生效流程一览 */
async function active(req, res) {
  const rows = await db.all(
    `SELECT * FROM approval_flow WHERE status = 'active' AND is_current = 1 AND deleted = 0 ORDER BY biz_module`
  );
  return res.json(success({ list: rows.map((f) => flowToDict(f)), total: rows.length }));
}

/** GET /api/approval-flows/:id/versions —— 同 flow_code 的全部版本 */
async function versions(req, res) {
  const flow = await db.get('SELECT * FROM approval_flow WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!flow) return res.status(404).json(fail('流程不存在', 404));
  const rows = await db.all(
    'SELECT * FROM approval_flow WHERE flow_code = ? AND deleted = 0 ORDER BY version DESC', [flow.flow_code]
  );
  return res.json(success({ list: rows.map((f) => flowToDict(f)), total: rows.length }));
}

/** GET /api/approval-flows/:id/logs —— 变更日志 */
async function logs(req, res) {
  const rows = await db.all(
    'SELECT * FROM approval_flow_log WHERE flow_id = ? AND deleted = 0 ORDER BY id DESC', [req.params.id]
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** GET /api/approval-flows/hooks —— 各审批分支接入状态（对齐数据包 FLOW_HOOK_MAP 视图） */
async function hooks(req, res) {
  const out = [];
  for (const [hook, cfg] of Object.entries(FLOW_HOOKS)) {
    const flow = await getActiveFlow(cfg.bizModule);
    const step = flow ? await getFlowStep(flow.id, cfg.stepNo) : null;
    out.push({
      hook, biz_module: cfg.bizModule, step_no: cfg.stepNo, label: cfg.label,
      flow_id: flow ? flow.id : null,
      flow_name: flow ? flow.flow_name : '',
      version: flow ? flow.version : null,
      flow_applied: !!step,
      step_name: step ? step.step_name : '',
      approver_role: step ? step.approver_role : '',
      approver_role_name: step ? step.approver_role_name : '',
      approver_user_ids: step ? (parseJSON(step.approver_user_ids, []) || []) : [],
      can_reject: step ? !!step.can_reject : true,
    });
  }
  return res.json(success({
    hooks: out, total: out.length,
    applied: out.filter((h) => h.flow_applied).length,
  }));
}

module.exports = {
  meta, list, getOne, create, update, remove, submit, approve, disable,
  newVersion, pending, active, versions, logs, hooks,
};
