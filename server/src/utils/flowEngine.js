/**
 * 可配置审批流引擎 —— 对齐数据包 app.py FLOW_HOOK_MAP + _flow_guard 体系
 *
 * 核心语义：
 * 1. 业务单据审批时先查该业务模块(biz_module)是否有「已生效(active)」流程
 * 2. 无生效流程 → 放行（保持硬编码工作流行为，向后兼容）
 * 3. 有生效流程 → 按 approval_flow_step 配置校验：
 *    - 步骤未配置 / 非必经 → 放行
 *    - sys_admin → 放行
 *    - 驳回动作且 can_reject=0 → 403
 *    - 指定审批人(approver_user_ids JSON)优先，其次按 approver_role 校验
 * 4. 配置实时生效（每次请求都查库，不缓存）
 */
const db = require('../db');
const { parseJSON } = require('./response');

/**
 * 审批钩子映射：hook -> { bizModule, stepNo, label }
 * 与数据包 FLOW_HOOK_MAP 对齐；biz_module 即前端菜单/流程配置里选的业务模块
 */
const FLOW_HOOKS = {
  'purchase_plan.review':            { bizModule: 'purchase-plan',   stepNo: 1, label: '采购计划审批' },
  'proc.purchaser_accept':           { bizModule: 'procurement',     stepNo: 1, label: '采购员验收' },
  'proc.quality_review':             { bizModule: 'procurement',     stepNo: 2, label: '质管审核' },
  'proc.warehouse_confirm':          { bizModule: 'procurement',     stepNo: 3, label: '库管确认' },
  'proc.quality_approve':            { bizModule: 'procurement',     stepNo: 4, label: '负责人批准' },
  'supplier.review':                 { bizModule: 'supplier',        stepNo: 1, label: '供应商审核' },
  'supplier.approve':                { bizModule: 'supplier',        stepNo: 2, label: '供应商批准' },
  'customer_archive.review':         { bizModule: 'customer-archive', stepNo: 1, label: '客户审核' },
  'customer_archive.approve':        { bizModule: 'customer-archive', stepNo: 2, label: '客户批准' },
  'personnel.review':                { bizModule: 'personnel',       stepNo: 1, label: '人员档案审核' },
  'personnel.approve':               { bizModule: 'personnel',       stepNo: 2, label: '人员档案批准' },
  'health_record.review':            { bizModule: 'health-archive',  stepNo: 1, label: '健康档案审核' },
  'health_record.approve':           { bizModule: 'health-archive',  stepNo: 2, label: '健康档案批准' },
  'training_plan.approve':           { bizModule: 'training',        stepNo: 1, label: '培训计划批准' },
  'first_factory_audit.review':      { bizModule: 'first-factory',   stepNo: 1, label: '首营企业审核' },
  'first_factory_audit.approve':     { bizModule: 'first-factory',   stepNo: 2, label: '首营企业批准' },
  'first_product_audit.review':      { bizModule: 'first-product',   stepNo: 1, label: '首营产品审核' },
  'first_product_audit.approve':     { bizModule: 'first-product',   stepNo: 2, label: '首营产品批准' },
  'cert_update_request.review':      { bizModule: 'supplier',        stepNo: 1, label: '证照变更审核' },
  'cert_update_request.approve':     { bizModule: 'supplier',        stepNo: 2, label: '证照变更批准' },
  'system_profile.review':           { bizModule: 'system-profile',  stepNo: 1, label: '企业资质审核' },
  'system_profile.approve':          { bizModule: 'system-profile',  stepNo: 2, label: '企业资质批准' },
  'product_acceptance.step':         { bizModule: 'procurement',     stepNo: 2, label: '产品验收步骤' },
  'outbound.flow':                   { bizModule: 'outbound',        stepNo: 0, label: '销售出库审批（按状态映射步骤）' },
};

// 业务模块选项（流程配置时用）
const BIZ_MODULES = [
  { id: 'purchase-plan',   name: '采购计划' },
  { id: 'procurement',     name: '采购入库' },
  { id: 'supplier',        name: '供应商档案' },
  { id: 'customer-archive', name: '客户档案' },
  { id: 'personnel',       name: '人员档案' },
  { id: 'health-archive',  name: '健康档案' },
  { id: 'training',        name: '培训管理' },
  { id: 'first-factory',   name: '首营企业' },
  { id: 'first-product',   name: '首营产品' },
  { id: 'system-profile',  name: '企业资质' },
  { id: 'outbound',        name: '销售出库' },
];

/** 查询业务模块当前生效流程（每次请求实时查，配置改完立即生效） */
async function getActiveFlow(bizModule) {
  if (!bizModule) return null;
  return db.get(
    `SELECT * FROM approval_flow
      WHERE biz_module = ? AND status = 'active' AND is_current = 1 AND deleted = 0
      ORDER BY version DESC LIMIT 1`,
    [bizModule]
  );
}

async function getFlowStep(flowId, stepNo) {
  return db.get(
    'SELECT * FROM approval_flow_step WHERE flow_id = ? AND step_no = ? AND deleted = 0',
    [flowId, stepNo]
  );
}

/**
 * 审批守卫 —— 有生效流程时按配置校验审批权限
 * @param {string} bizModule 业务模块 id
 * @param {number} stepNo    步骤序号（1 开始；0 表示按 outbound 状态映射的场景由调用方自己换算）
 * @param {object} req       Express req（用 req.userRoleCode / req.userId / req.user）
 * @param {string} action    'approve' | 'reject'
 * @returns {Promise<null|{status:number, message:string, extra?:object}>} null=放行
 */
async function flowGuard(bizModule, stepNo, req, action = 'approve') {
  const flow = await getActiveFlow(bizModule);
  if (!flow) return null;
  const step = await getFlowStep(flow.id, stepNo);
  if (!step || !step.is_required) return null;
  if (req.userRoleCode === 'sys_admin') return null;

  // 驳回校验：该步骤配置为不可驳回时拒绝驳回动作
  const act = String(action || '').trim().toLowerCase();
  if (['reject', 'rejected', 'rollback'].includes(act) && !step.can_reject) {
    return {
      status: 403,
      message: `按审批流程配置，步骤「${step.step_name}」不允许驳回`,
      extra: { flow_applied: true, step_name: step.step_name },
    };
  }

  // 指定审批人优先
  const ids = parseJSON(step.approver_user_ids, []) || [];
  if (ids.length) {
    if (!ids.includes(req.userId)) {
      const names = [];
      for (const uid of ids) {
        const u = await db.get('SELECT name FROM users WHERE id = ?', [uid]);
        if (u) names.push(u.name);
      }
      const who = names.join('、') || '指定人员';
      return {
        status: 403,
        message: `按审批流程配置，步骤「${step.step_name}」需由 ${who} 审批，您不在指定审批人范围内`,
        extra: { flow_applied: true, step_name: step.step_name, approver_names: names },
      };
    }
    return null;
  }

  // 按角色校验
  if (step.approver_role && req.userRoleCode !== step.approver_role) {
    return {
      status: 403,
      message: `按审批流程配置，步骤「${step.step_name}」需由「${step.approver_role_name || step.approver_role}」审批，您当前的角色无此步骤的审批权限`,
      extra: {
        flow_applied: true, step_name: step.step_name,
        required_role: step.approver_role, required_role_name: step.approver_role_name,
      },
    };
  }
  return null;
}

/** 下一步骤配置（用于通知推送），无配置返回 null */
async function nextStepInfo(bizModule, stepNo) {
  const flow = await getActiveFlow(bizModule);
  if (!flow) return null;
  const nxt = await getFlowStep(flow.id, stepNo + 1);
  if (!nxt) return null;
  return {
    role: nxt.approver_role,
    userIds: parseJSON(nxt.approver_user_ids, []) || [],
    stepName: nxt.step_name,
    ccRoles: parseJSON(nxt.cc_roles, []) || [],
  };
}

/** 流程变更日志（GSP 流程变更可追溯） */
async function logFlowAction(flow, action, fromStatus, toStatus, opinion, req) {
  await db.run(
    `INSERT INTO approval_flow_log
      (flow_id, flow_code, flow_name, version, action, from_status, to_status, opinion,
       operator_id, operator_name, operator_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [flow.id, flow.flow_code, flow.flow_name, flow.version, action,
      fromStatus || '', toStatus || '', opinion || '',
      req ? req.userId : 0, req ? (req.user.name || req.user.username) : '', req ? req.userRoleCode : '']
  );
}

module.exports = { FLOW_HOOKS, BIZ_MODULES, getActiveFlow, getFlowStep, flowGuard, nextStepInfo, logFlowAction };
