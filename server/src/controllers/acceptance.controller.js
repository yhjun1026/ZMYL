/**
 * 产品验收五步流 —— 对齐数据包 workflow_step_product_acceptance（GSP第54-58条）
 *
 * 待验收 →(外观检查)→ 外观检查完成 →(数量核对)→ 数量核对完成 →(质量检验)→ 质量检验完成 →(综合判定)→ 已完成
 * 合规拦截：任一环节"不合格"即进入「不合格待处理」，不流入下一环节
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { pushNotification } = require('../utils/notify');

// (当前状态, 步骤) -> 下一状态
const PA_TRANSITIONS = {
  '待验收|appearance': '外观检查完成',
  '外观检查完成|quantity': '数量核对完成',
  '数量核对完成|quality': '质量检验完成',
  '质量检验完成|approve': '已完成',
};

const STEP_ROLES = ['sys_admin', 'quality_mgr', 'quality_staff', 'inspector', 'warehouse'];

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
}
function nowFull() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}
function displayName(req) {
  return req.user.name || req.user.username;
}

async function logOp(text, user) {
  try {
    await db.run(
      'INSERT INTO operation_log ("time", "text", "user", created_at, deleted) VALUES (?, ?, ?, ?, 0)',
      [nowFull(), text, user, nowFull()]
    );
  } catch { /* 缺表忽略 */ }
}

/**
 * POST /api/product_acceptance/:id/workflow-step
 * body: { step: 'appearance'|'quantity'|'quality'|'approve', result?, remark?, reviewer?, date?, overall_result?, opinion? }
 */
async function paStep(req, res) {
  const { id } = req.params;
  if (!STEP_ROLES.includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需质管员/质量负责人/验收员/库管员）', 403));
  }

  const pa = await db.get('SELECT * FROM product_acceptance WHERE id = ? AND deleted = 0', [id]);
  if (!pa) return res.status(404).json(fail('验收记录不存在', 404));

  const body = req.body || {};
  const step = body.step || '';
  const key = `${pa.workflow_status}|${step}`;
  if (!(key in PA_TRANSITIONS)) {
    return res.status(400).json(fail(`不允许从「${pa.workflow_status}」执行「${step}」步骤`, 400));
  }

  const reviewer = body.reviewer || displayName(req);
  const dateStr = body.date || nowFull().slice(0, 10);
  const sets = { workflow_status: PA_TRANSITIONS[key] };
  let stepResult = '合格';

  if (step === 'appearance') {
    stepResult = body.result || '合格';
    Object.assign(sets, {
      appearance_check: stepResult, appearance_reviewer: reviewer,
      appearance_date: dateStr, appearance_remark: body.remark || '',
    });
  } else if (step === 'quantity') {
    stepResult = body.result || '合格';
    Object.assign(sets, {
      quantity_check: stepResult, quantity_reviewer: reviewer,
      quantity_date: dateStr, quantity_remark: body.remark || '',
    });
  } else if (step === 'quality') {
    stepResult = body.result || '合格';
    Object.assign(sets, {
      quality_check: stepResult, quality_reviewer: reviewer,
      quality_date: dateStr, quality_remark: body.remark || '',
    });
  } else { // approve
    const verdict = body.overall_result || '';
    if (!['合格', '不合格', '有条件合格'].includes(verdict)) {
      return res.status(400).json(fail('综合判定结果必须为：合格/不合格/有条件合格', 400));
    }
    stepResult = verdict;
    Object.assign(sets, {
      overall_result: verdict, final_approver: reviewer,
      final_approval_date: dateStr, final_opinion: body.opinion || '',
    });
  }

  // 合规拦截：不合格不得流入下一环节
  const blocked = (step !== 'approve' && stepResult === '不合格')
    || (step === 'approve' && (stepResult === '不合格' || stepResult === '有条件合格'));
  if (blocked) {
    Object.assign(sets, { workflow_status: '不合格待处理' });
    if (step !== 'approve') sets.overall_result = '不合格';
    await db.run(
      `UPDATE product_acceptance SET ${Object.keys(sets).map((k) => `"${k}" = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(sets), id]
    );
    await logOp(`产品验收${stepResult}拦截: ${pa.product_name}#${id} 步骤=${step} → 不合格待处理`, reviewer);
    await pushNotification({
      title: `验收不合格: ${pa.product_name}`,
      content: `验收「${step}」环节判定${stepResult}，已拦截进入「不合格待处理」，须按不合格品管理程序处理。`,
      module: '产品验收', refNo: pa.batch_no || '', refId: pa.id, actionType: '不合格拦截',
      targetRole: 'quality_mgr', sourceUser: reviewer,
    });
    return res.status(409).json(success(
      { workflow_status: '不合格待处理' },
      `「${step}」判定${stepResult}，验收已拦截进入「不合格待处理」，须按不合格品管理程序处理`
    ));
  }

  await db.run(
    `UPDATE product_acceptance SET ${Object.keys(sets).map((k) => `"${k}" = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(sets), id]
  );

  const newStatus = PA_TRANSITIONS[key];
  await logOp(`产品验收推进: ${pa.product_name}#${id} → ${newStatus}（步骤=${step}）`, reviewer);
  auditLog('WF_PA_STEP', req.userId, `product_acceptance#${id}`, { step, newStatus });

  // 完成时通知质管归档
  if (newStatus === '已完成') {
    await pushNotification({
      title: `验收完成: ${pa.product_name}`,
      content: `五步验收全部通过，综合判定「合格」，已归档。`,
      module: '产品验收', refNo: pa.batch_no || '', refId: pa.id, actionType: '验收完成',
      targetRole: 'quality_mgr', sourceUser: reviewer,
    });
  }

  return res.json(success({ workflow_status: newStatus }, `验收步骤「${step}」完成，状态已更新为「${newStatus}」`));
}

/**
 * POST /api/product_acceptance/:id/workflow-reset
 * 不合格待处理 → 重新验收（清空步骤结果）
 */
async function paReset(req, res) {
  const { id } = req.params;
  if (!['sys_admin', 'quality_mgr'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需质量负责人）', 403));
  }
  const pa = await db.get('SELECT * FROM product_acceptance WHERE id = ? AND deleted = 0', [id]);
  if (!pa) return res.status(404).json(fail('验收记录不存在', 404));
  if (pa.workflow_status !== '不合格待处理') {
    return res.status(400).json(fail(`仅「不合格待处理」状态可重置（当前: ${pa.workflow_status}）`, 400));
  }

  await db.run(
    `UPDATE product_acceptance SET
       workflow_status = '待验收',
       appearance_check = '待检', appearance_reviewer = '', appearance_date = '', appearance_remark = '',
       quantity_check = '待检', quantity_reviewer = '', quantity_date = '', quantity_remark = '',
       quality_check = '待检', quality_reviewer = '', quality_date = '', quality_remark = '',
       overall_result = '待定', final_approver = '', final_approval_date = '', final_opinion = ''
     WHERE id = ?`,
    [id]
  );
  await logOp(`产品验收重置重新验收: ${pa.product_name}#${id}`, displayName(req));
  auditLog('WF_PA_RESET', req.userId, `product_acceptance#${id}`, {});
  return res.json(success({ workflow_status: '待验收' }, '已重置为「待验收」，请重新执行五步验收'));
}

/** GET /api/product_acceptance/expiry-stats —— 效期分布统计 */
async function paExpiryStats(req, res) {
  const rows = await db.all(
    `SELECT
       SUM(CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END) AS no_expiry,
       SUM(CASE WHEN expiry_date != '' AND expiry_date <= date('now', '+90 days') THEN 1 ELSE 0 END) AS expiring_90d,
       SUM(CASE WHEN expiry_date != '' AND expiry_date > date('now', '+90 days') AND expiry_date <= date('now', '+180 days') THEN 1 ELSE 0 END) AS expiring_180d,
       SUM(CASE WHEN expiry_date != '' AND expiry_date > date('now', '+180 days') THEN 1 ELSE 0 END) AS safe
     FROM product_acceptance WHERE deleted = 0`
  );
  const r = rows[0] || {};
  return res.json(success({
    无效期: r.no_expiry || 0,
    '90天内到期': r.expiring_90d || 0,
    '180天内到期': r.expiring_180d || 0,
    安全线内: r.safe || 0,
  }));
}

module.exports = { paStep, paReset, paExpiryStats, PA_TRANSITIONS };
