/**
 * 数据互联互通引擎 —— 对齐数据包 app.py「数据互联互通核心引擎」
 *
 * 模块间自动数据流转：
 *  - 采购入库完成 → 自动生成财务支出记录（采购转财务）
 *  - 销售出库完成 → 自动生成财务收入记录（出库转财务，P3 已接入）
 *  - 采购到货（采购员验收）→ 自动创建产品验收记录（采购转验收）
 * 每次联动写入 data_bridge_log，供「数据桥接日志」模块与汇总接口追溯
 */
const db = require('../db');
const logger = require('./logger');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

/** 记录数据联动日志（fire-and-forget） */
async function logBridge(bridgeType, sourceModule, sourceRef, targetModule, targetRef, description) {
  try {
    await db.run(
      `INSERT INTO data_bridge_log
        (bridge_type, source_module, source_ref, target_module, target_ref, description, status, created_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, '成功', ?, 0)`,
      [bridgeType, sourceModule, sourceRef || '', targetModule, targetRef || '', description || '', nowStr()]
    );
  } catch (err) {
    logger.warn(`[bridge] 联动日志写入失败: ${err.message}`);
  }
}

/** 采购入库自动生成财务支出记录（幂等：同 ref_no 支出只记一次） */
async function autoFinanceExpense(refNo, amount, fType, dept, note) {
  try {
    const existing = await db.get(
      "SELECT id FROM finance_record WHERE ref_no = ? AND category = '支出' AND deleted = 0 LIMIT 1", [refNo]
    );
    if (existing) return null;
    const info = await db.run(
      `INSERT INTO finance_record (category, type, amount, "date", ref_no, dept, operator, note, created_at, deleted)
       VALUES ('支出', ?, ?, ?, ?, ?, '', ?, ?, 0)`,
      [fType || '采购支出', amount || 0, nowStr().slice(0, 10), refNo, dept || '采购部', note || '', nowStr()]
    );
    await logBridge('采购转财务', '采购管理', refNo, '财务管理', '',
      `采购单${refNo}自动生成财务支出记录${amount || 0}元`);
    return info.insertId;
  } catch (err) {
    logger.warn(`[bridge] 财务联动失败: ${err.message}`);
    return null;
  }
}

/** 销售出库自动生成财务收入记录（幂等） */
async function autoFinanceIncome(refNo, amount, customer, note) {
  try {
    const existing = await db.get(
      "SELECT id FROM finance_record WHERE ref_no = ? AND category = '收入' AND deleted = 0 LIMIT 1", [refNo]
    );
    if (existing) return null;
    const info = await db.run(
      `INSERT INTO finance_record (category, type, amount, "date", ref_no, dept, operator, note, created_at, deleted)
       VALUES ('收入', '销售收入', ?, ?, ?, '销售部', '', ?, ?, 0)`,
      [amount || 0, nowStr().slice(0, 10), refNo, note || '', nowStr()]
    );
    await logBridge('出库转财务', '销售出库', refNo, '财务管理', '',
      `出库单${refNo}自动生成财务收入记录${amount || 0}元`);
    return info.insertId;
  } catch (err) {
    logger.warn(`[bridge] 财务联动失败: ${err.message}`);
    return null;
  }
}

/**
 * 采购到货（采购员验收通过）自动创建产品验收记录（幂等：同 linked_proc_id 只建一次）
 * @param {number} procId 采购单 id
 * @param {string} table  'proc_equipment' | 'proc_consumable'
 */
async function autoCreateProductAcceptance(procId, table) {
  try {
    const src = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [procId]);
    if (!src) return null;
    const existing = await db.get(
      'SELECT id FROM product_acceptance WHERE linked_proc_id = ? AND deleted = 0 LIMIT 1', [procId]
    );
    if (existing) return null;
    const info = await db.run(
      `INSERT INTO product_acceptance
        (linked_proc_id, product_name, product_udi, batch_no, manufacturer, prod_license_no,
         reg_cert_no, supplier, quantity, accept_date, accept_person, check_type, workflow_status, created_at, deleted)
       VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, '到货验收', '待验收', ?, 0)`,
      [procId, src.equip_name || '', src.batch || '', src.factory_name || '',
        src.prod_license_no || '', src.reg_cert_no || '', src.supplier || '',
        src.qty || 1, nowStr().slice(0, 10), src.purchaser_accepted || '', nowStr()]
    );
    await logBridge('采购转验收', '采购管理', src.order_no || `proc_${procId}`, '产品验收', '',
      `采购单${src.order_no || procId}到货自动创建产品验收记录`);
    return info.insertId;
  } catch (err) {
    logger.warn(`[bridge] 验收联动失败: ${err.message}`);
    return null;
  }
}

module.exports = { logBridge, autoFinanceExpense, autoFinanceIncome, autoCreateProductAcceptance };
