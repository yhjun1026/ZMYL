/**
 * 工作流控制器 —— 对齐老后端 routers/workflow.py（并修复其重复函数定义 bug）
 *
 * 1. 两级审批（质管员审核 -> 质量负责人批准）
 *    supplier / customer_archive / personnel / health_record / training_plan
 *    / first_factory_audit / first_product_audit / system_profile / cert_update_request
 * 2. 采购计划单级审批（销售总监）+ 转采购执行单
 * 3. 采购入库五步流：待验收 -> 待质管审核 -> 待库管确认 -> 待负责人批准 -> 已入库
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { WORKFLOW } = require('../config/modules');
const { flowGuard } = require('../utils/flowEngine');
const { autoCreateProductAcceptance, autoFinanceExpense } = require('../utils/bridge');

const REVIEW_ROLES = new Set(['sys_admin', 'quality_staff', 'quality_mgr']);
const APPROVE_ROLES = new Set(['sys_admin', 'quality_mgr']);

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16); // YYYY-MM-DD HH:MM
}
function nowFull() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

/** 写操作日志（operation_log 表 + audit_log 双写） */
async function logOp(text, user) {
  try {
    await db.run(
      'INSERT INTO operation_log ("time", "text", "user", "created_at", "deleted") VALUES (?, ?, ?, ?, 0)',
      [nowFull(), text, user]
    );
  } catch {
    /* operation_log 表未建时忽略 */
  }
}

function displayName(req) {
  return req.user.name || req.user.username;
}

// 表名 -> 审批流 biz_module（与 utils/flowEngine BIZ_MODULES 对齐）
const BIZ_MODULE = {
  supplier: 'supplier', customer_archive: 'customer-archive', personnel: 'personnel',
  health_record: 'health-archive', training_plan: 'training',
  first_factory_audit: 'first-factory', first_product_audit: 'first-product',
  system_profile: 'system-profile', cert_update_request: 'supplier',
};

/**
 * 可配置审批流守卫：该模块有生效流程时按配置校验（配置优先于硬编码角色）
 * 返回 true 表示已被拦截（响应已发出）；false 表示放行且调用方需继续走硬编码角色校验
 */
async function applyFlowGuard(req, res, bizModule, stepNo, action) {
  const err = await flowGuard(bizModule, stepNo, req, action);
  if (err) {
    res.status(err.status).json(fail(err.message, err.status));
    return true;
  }
  const { getActiveFlow } = require('../utils/flowEngine');
  const flow = await getActiveFlow(bizModule);
  return !!flow; // 有生效流程 → 硬编码角色校验可跳过
}

// ============ 两级审批流 ============

/**
 * PUT /api/{resource}/{id}/review   两级审批 - 第一步（审核）
 * body: { action: 'approve' | 'reject', opinion }
 */
async function review(req, res) {
  const { table: resource, id } = req.params;
  if (!WORKFLOW.TWO_LEVEL.includes(resource) && resource !== 'cert_update_request') {
    return res.status(404).json(fail('该模块不支持审核流', 404));
  }
  const { action = 'approve', opinion = '' } = req.body || {};
  // 可配置审批流优先：有生效流程则按其配置校验，否则走硬编码角色
  const flowApplied = await applyFlowGuard(req, res, BIZ_MODULE[resource], 1, action);
  if (res.writableEnded) return;
  if (!flowApplied && !REVIEW_ROLES.has(req.userRoleCode)) {
    return res.status(403).json(fail('无审核权限（需质管员或质量负责人）', 403));
  }

  const obj = await db.get(`SELECT * FROM "${resource}" WHERE id = ?`, [id]);
  if (!obj) return res.status(404).json(fail('记录不存在', 404));

  if (resource !== 'cert_update_request' && obj.workflow_status !== '待审核') {
    return res.status(400).json(fail(`仅"待审核"状态可审核（当前: ${obj.workflow_status}）`, 400));
  }

  const status = action === 'approve' ? '已审核' : '已驳回';
  const reviewer = displayName(req);

  await db.run(
    `UPDATE "${resource}" SET reviewed_by = ?, reviewed_at = ?, review_opinion = ?, workflow_status = ? WHERE id = ?`,
    [reviewer, nowStr(), opinion || '', status, id]
  );

  await logOp(`审核${resource}#${id} -> ${status}`, reviewer);
  auditLog('WF_REVIEW', req.userId, `${resource}#${id}`, { action, status });
  return res.json(success({ workflow_status: status }, `审核完成: ${status}`));
}

/**
 * PUT /api/{resource}/{id}/approve   两级审批 - 第二步（批准）
 * body: { action: 'approve' | 'reject', opinion }
 */
async function approve(req, res) {
  const { table: resource, id } = req.params;
  if (!WORKFLOW.TWO_LEVEL.includes(resource) && resource !== 'cert_update_request') {
    return res.status(404).json(fail('该模块不支持审批流', 404));
  }
  const { action = 'approve', opinion = '' } = req.body || {};
  const flowApplied = await applyFlowGuard(req, res, BIZ_MODULE[resource], 2, action);
  if (res.writableEnded) return;
  if (!flowApplied && !APPROVE_ROLES.has(req.userRoleCode)) {
    return res.status(403).json(fail('无审批权限（需质量负责人）', 403));
  }

  const obj = await db.get(`SELECT * FROM "${resource}" WHERE id = ?`, [id]);
  if (!obj) return res.status(404).json(fail('记录不存在', 404));

  if (resource !== 'cert_update_request' && obj.workflow_status !== '已审核') {
    return res.status(400).json(fail(`仅"已审核"状态可最终批准（当前: ${obj.workflow_status}）`, 400));
  }

  const status = action === 'approve' ? '已批准' : '已驳回';
  const approver = displayName(req);

  await db.run(
    `UPDATE "${resource}" SET approved_by = ?, approved_at = ?, approval_opinion = ?, workflow_status = ? WHERE id = ?`,
    [approver, nowStr(), opinion || '', status, id]
  );

  await logOp(`批准${resource}#${id} -> ${status}`, approver);
  auditLog('WF_APPROVE', req.userId, `${resource}#${id}`, { action, status });
  return res.json(success({ workflow_status: status }, `最终审批: ${status}`));
}

// ============ 采购计划：单级审批 + 转采购执行单 ============

/**
 * POST /api/purchase_plan/{id}/review
 * body: { action, opinion }   待审批 -> 已批准/已驳回
 */
async function reviewPlan(req, res) {
  const { id } = req.params;
  const { action = 'approve', opinion = '' } = req.body || {};
  const flowApplied = await applyFlowGuard(req, res, 'purchase-plan', 1, action);
  if (res.writableEnded) return;
  if (!flowApplied && !['sys_admin', 'sales_director'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无审批权限（需销售总监）', 403));
  }

  const plan = await db.get('SELECT * FROM purchase_plan WHERE id = ?', [id]);
  if (!plan) return res.status(404).json(fail('采购计划不存在', 404));
  if (plan.workflow_status !== '待审批') {
    return res.status(400).json(fail(`当前状态"${plan.workflow_status}"，无法审核`, 400));
  }

  const status = action === 'approve' ? '已批准' : '已驳回';
  const reviewer = displayName(req);

  await db.run(
    `UPDATE purchase_plan SET reviewed_by = ?, reviewed_at = ?, review_opinion = ?, workflow_status = ?, status = ? WHERE id = ?`,
    [reviewer, nowStr(), opinion || (action === 'approve' ? '同意，进入采购流程' : '审核驳回'), status, status, id]
  );

  await logOp(`审核采购计划#${id} -> ${status}`, reviewer);
  auditLog('WF_PLAN_REVIEW', req.userId, `purchase_plan#${id}`, { action, status });
  return res.json(success({ workflow_status: status }, `采购计划${status}`));
}

/**
 * POST /api/purchase_plan/{id}/convert-to-procurement
 * 已批准的计划 -> 生成采购执行单（设备/耗材二选一），计划状态 -> 已转采购
 */
async function convertPlan(req, res) {
  const { id } = req.params;
  if (!['sys_admin', 'purchaser'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需采购员）', 403));
  }

  const plan = await db.get('SELECT * FROM purchase_plan WHERE id = ?', [id]);
  if (!plan) return res.status(404).json(fail('采购计划不存在', 404));
  if (plan.workflow_status !== '已批准') {
    return res.status(400).json(fail('只有已批准的计划才能转为采购执行单', 400));
  }

  const user = displayName(req);
  const today = nowFull().slice(0, 10);
  const orderNo = `PO-${nowFull().replace(/[-: ]/g, '').slice(0, 14)}`;
  const isConsumable = (plan.category || '') === '耗材';
  const target = isConsumable ? 'proc_consumable' : 'proc_equipment';

  const created = await db.transaction((tx) => {
    const info = tx.run(
      `INSERT INTO "${target}"
        (order_no, linked_plan_id, factory_name, equip_name, equip_model, qty, amount,
         "date", applicant, workflow_status, status, type, created_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        orderNo, plan.id, plan.factory_name || '', plan.name || '',
        plan.spec_model || '', plan.qty || 1, plan.budget || 0,
        today, user, '待验收', '采购中',
        isConsumable ? '耗材采购' : '设备采购', nowFull(),
      ]
    );
    tx.run(
      'UPDATE purchase_plan SET workflow_status = ?, status = ? WHERE id = ?',
      ['已转采购', '已转采购', plan.id]
    );
    return info;
  });

  await logOp(`采购计划#${id}转采购执行单 ${orderNo}`, user);
  auditLog('WF_PLAN_CONVERT', req.userId, `purchase_plan#${id}`, { orderNo, target });

  return res.json(success(
    { order_no: orderNo, id: created.insertId },
    `已生成采购执行单 ${orderNo}`
  ));
}

// ============ 采购入库五步流 ============
// (action, from_status, to_status, roles, label, 落库字段前缀)
const PROC_STEPS = [
  { action: 'purchaser-accept',  from: '待验收',     to: '待质管审核',   roles: ['sys_admin', 'purchaser'],              label: '采购员验收', prefix: 'purchaser_accepted' },
  { action: 'quality-review',    from: '待质管审核', to: '待库管确认',   roles: ['sys_admin', 'quality_staff', 'quality_mgr'], label: '质管审核', prefix: 'quality_reviewed' },
  { action: 'warehouse-confirm', from: '待库管确认', to: '待负责人批准', roles: ['sys_admin', 'warehouse'],              label: '库管确认',   prefix: 'warehouse_confirmed' },
  { action: 'quality-approve',   from: '待负责人批准', to: '已入库',     roles: ['sys_admin', 'quality_mgr'],            label: '负责人批准', prefix: 'quality_approved' },
];

/**
 * POST /api/{resource}/{id}/{step}
 * body: { action: 'approve' | 'reject', opinion? }
 */
async function procFlow(req, res) {
  const { table: resource, id, step: action } = req.params;
  if (!WORKFLOW.PROC.includes(resource)) {
    return res.status(404).json(fail('不支持的操作', 404));
  }
  const step = PROC_STEPS.find((s) => s.action === action);
  if (!step) return res.status(404).json(fail('未知操作', 404));
  const { action: act = 'approve', opinion = '' } = req.body || {};
  // 可配置审批流优先（procurement 模块，step_no = 五步流序号）
  const stepNo = PROC_STEPS.indexOf(step) + 1;
  const flowApplied = await applyFlowGuard(req, res, 'procurement', stepNo, act);
  if (res.writableEnded) return;
  if (!flowApplied && !step.roles.includes(req.userRoleCode)) {
    return res.status(403).json(fail(`无权限执行[${step.label}]（需角色: ${step.roles.join('/')}）`, 403));
  }

  const obj = await db.get(`SELECT * FROM "${resource}" WHERE id = ?`, [id]);
  if (!obj) return res.status(404).json(fail('记录不存在', 404));
  if (obj.workflow_status !== step.from) {
    return res.status(400).json(fail(`当前状态"${obj.workflow_status}"，不能执行[${step.label}]`, 400));
  }

  const reject = act === 'reject';
  const status = reject ? '已驳回' : step.to;
  const user = displayName(req);

  // 状态推进 + 每步留痕（purchaser_accepted / quality_reviewed / warehouse_confirmed / quality_approved）
  const sets = ['workflow_status = ?'];
  const params = [status];
  const trace = `${user}:${reject ? '驳回' : '通过'}${opinion ? `(${opinion})` : ''}`;
  sets.push(`"${step.prefix}" = ?`);
  params.push(trace);
  // 各步骤时间戳字段（存在才写）
  const tsCol = { 'purchaser_accepted': 'purchaser_accepted_at', 'quality_reviewed': 'quality_reviewed_at', 'warehouse_confirmed': 'warehouse_confirmed_at', 'quality_approved': 'quality_approved_at' }[step.prefix];
  const opinionCol = { 'purchaser_accepted': 'purchaser_opinion', 'quality_reviewed': 'quality_review_opinion', 'warehouse_confirmed': 'warehouse_opinion', 'quality_approved': 'quality_approval_opinion' }[step.prefix];
  const meta = await db.raw.prepare(`PRAGMA table_info("${resource}")`).all();
  const colSet = new Set(meta.map((c) => c.name));
  if (colSet.has(tsCol)) { sets.push(`"${tsCol}" = ?`); params.push(nowStr()); }
  if (colSet.has(opinionCol)) { sets.push(`"${opinionCol}" = ?`); params.push(opinion || (reject ? '驳回' : '通过')); }
  params.push(id);

  await db.run(`UPDATE "${resource}" SET ${sets.join(', ')} WHERE id = ?`, params);

  // ---- 数据互联互通（P4）：通过时触发跨模块联动 ----
  if (!reject && step.action === 'purchaser-accept') {
    // 采购到货 → 自动创建产品验收记录（幂等）
    await autoCreateProductAcceptance(Number(id), resource);
  }
  if (!reject && step.action === 'quality-approve') {
    // 采购入库完成 → 自动生成财务支出记录（幂等）
    const amount = obj.amount || 0;
    if (amount > 0) {
      await autoFinanceExpense(obj.order_no || `${resource}#${id}`, amount,
        obj.type || '采购支出', '采购部',
        `采购入库自动记账: ${obj.equip_name || ''} x${obj.qty || 0} 供应商:${obj.supplier || ''}`);
    }
  }

  await logOp(`${resource}#${id} ${step.label} -> ${status}`, user);
  auditLog('WF_PROC', req.userId, `${resource}#${id}`, { action, status });

  return res.json(success({ workflow_status: status }, `${step.label}完成: ${status}`));
}

module.exports = { review, approve, reviewPlan, convertPlan, procFlow, PROC_STEPS };
