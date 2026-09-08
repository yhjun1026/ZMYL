/**
 * 数据互联互通 Bridge API —— 对齐数据包 app.py /api/bridge 系列接口
 *
 * 提供跨模块数据选项（下拉联动）、待办聚合、数据流转汇总
 */
const db = require('../db');
const { success, fail } = require('../utils/response');

/** GET /api/bridge/inventory-options —— 库存选项（出库/冷链关联用） */
async function inventoryOptions(req, res) {
  const rows = await db.all(
    `SELECT id, udi, "name", batch, qty, location, manufacturer FROM inventory
      WHERE deleted = 0 AND qty > 0 ORDER BY id DESC LIMIT 500`
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** GET /api/bridge/supplier-options */
async function supplierOptions(req, res) {
  const rows = await db.all(
    `SELECT id, name, code, contact, phone FROM supplier
      WHERE deleted = 0 AND workflow_status = '已批准' ORDER BY id DESC LIMIT 500`
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** GET /api/bridge/customer-options */
async function customerOptions(req, res) {
  const rows = await db.all(
    `SELECT id, name, credit_code, contact, phone FROM customer_archive
      WHERE deleted = 0 AND workflow_status = '已批准' ORDER BY id DESC LIMIT 500`
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** GET /api/bridge/product-options —— 产品选项（来自库存品名去重） */
async function productOptions(req, res) {
  const rows = await db.all(
    `SELECT "name", COUNT(*) AS batches, SUM(qty) AS total_qty FROM inventory
      WHERE deleted = 0 GROUP BY "name" ORDER BY total_qty DESC LIMIT 300`
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** GET /api/bridge/factory-options —— 生产厂家选项（首营企业 + 供应商去重） */
async function factoryOptions(req, res) {
  const rows = await db.all(
    `SELECT name FROM first_factory_audit WHERE deleted = 0 AND workflow_status = '已批准'
     UNION SELECT factory AS name FROM first_product_audit WHERE deleted = 0 AND factory != ''
     ORDER BY name LIMIT 300`
  );
  return res.json(success({ list: rows.map((r) => r.name), total: rows.length }));
}

/**
 * GET /api/bridge/pending-approvals —— 跨模块待办聚合
 * 汇总各工作流表的待处理数量与明细（当前用户视角按角色过滤由前端做，这里给全量）
 */
async function pendingApprovals(req, res) {
  const groups = [];
  const add = async (module, table, statusField, statuses, labelField) => {
    try {
      const ph = statuses.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT id, "${labelField}" AS label, "${statusField}" AS status FROM "${table}"
          WHERE deleted = 0 AND "${statusField}" IN (${ph}) ORDER BY id DESC LIMIT 20`,
        statuses
      );
      if (rows.length) groups.push({ module, table, count: rows.length, items: rows });
    } catch { /* 表不存在时跳过 */ }
  };

  await add('采购计划', 'purchase_plan', 'workflow_status', ['待审批'], 'name');
  await add('采购入库', 'proc_equipment', 'workflow_status', ['待验收', '待质管审核', '待库管确认', '待负责人批准'], 'equip_name');
  await add('采购入库(耗材)', 'proc_consumable', 'workflow_status', ['待验收', '待质管审核', '待库管确认', '待负责人批准'], 'equip_name');
  await add('销售出库', 'outbound_record', 'status',
    ['待销售经理审核', '待质管员审核', '待库管员审核', '待质量负责人审核', '待销售总监审核'], 'equip_name');
  await add('产品验收', 'product_acceptance', 'workflow_status', ['待验收', '外观检查完成', '数量核对完成', '质量检验完成'], 'product_name');
  await add('首营企业', 'first_factory_audit', 'workflow_status', ['待审核', '已审核'], 'name');
  await add('首营产品', 'first_product_audit', 'workflow_status', ['待审核', '已审核'], 'name');
  await add('供应商档案', 'supplier', 'workflow_status', ['待审核', '已审核'], 'name');
  await add('客户档案', 'customer_archive', 'workflow_status', ['待审核', '已审核'], 'name');
  await add('证照变更', 'cert_update_request', 'status', ['待审核', '已审核', '待审批'], 'record_name');
  await add('冷链报警', 'cold_chain_alarm', 'status', ['pending', 'processing'], 'alarm_no');
  await add('审批流程', 'approval_flow', 'status', ['pending'], 'flow_name');

  const total = groups.reduce((s, g) => s + g.count, 0);
  return res.json(success({ groups, total }));
}

/** GET /api/bridge/data-flow-summary —— 数据流转汇总（按联动类型统计 + 最近记录） */
async function dataFlowSummary(req, res) {
  const byType = await db.all(
    `SELECT bridge_type, COUNT(*) AS c, MAX(created_at) AS last_at FROM data_bridge_log
      WHERE deleted = 0 GROUP BY bridge_type ORDER BY c DESC`
  );
  const recent = await db.all(
    'SELECT * FROM data_bridge_log WHERE deleted = 0 ORDER BY id DESC LIMIT 50'
  );
  const total = byType.reduce((s, t) => s + t.c, 0);
  return res.json(success({ by_type: byType, recent, total }));
}

module.exports = {
  inventoryOptions, supplierOptions, customerOptions, productOptions, factoryOptions,
  pendingApprovals, dataFlowSummary,
};
