const db = require('../db');
const { success } = require('../utils/response');

/**
 * GET /api/dashboard
 * P1: 返回前端 Dashboard.vue 期望的所有字段（兼容旧版 15 字段名）
 * P2 接真实业务表后填实数
 */
async function stats(req, res) {
  // 探测表存在性（如果表还没建，对应字段保持 0）
  const safeCount = async (sql, fallback = 0) => {
    try { return (await db.get(sql)).c || fallback; } catch { return fallback; }
  };

  // 真实统计（P1 业务表还没建，全部 fallback 到 0，P2 接 39 表后填实数）
  const [
    totalDevices, inUse, totalInventory, lowStock, expiring,
    certExpiring, certExpired, pendingRepairs, pendingAdverse,
    pendingPlans, pendingRecall, todayOutbound, totalPersonnel,
    outbound30d, adverseTotal,
  ] = await Promise.all([
    safeCount('SELECT COUNT(*) c FROM equip_ledger'),
    safeCount("SELECT COUNT(*) c FROM equip_ledger WHERE status = '在用'"),
    safeCount('SELECT COALESCE(SUM(qty),0) c FROM inventory'),
    safeCount('SELECT COUNT(*) c FROM inventory WHERE qty < min_stock'),
    safeCount("SELECT COUNT(*) c FROM expiry_warning WHERE remain_days <= 90"),
    safeCount("SELECT COUNT(*) c FROM supplier WHERE license_expire <= date('now','+90 days') AND status='合作中'"),
    safeCount("SELECT COUNT(*) c FROM supplier WHERE license_expire < date('now') AND status='合作中'"),
    safeCount("SELECT COUNT(*) c FROM repair_order WHERE status IN ('待维修','维修中')"),
    safeCount("SELECT COUNT(*) c FROM adverse_event WHERE status = '待查'"),
    safeCount("SELECT COUNT(*) c FROM purchase_plan WHERE workflow_status='待审批'"),
    safeCount("SELECT COUNT(*) c FROM recall_record WHERE status IN ('进行中','部分退回')"),
    safeCount("SELECT COUNT(*) c FROM outbound_record WHERE date >= date('now','-1 day')"),
    safeCount('SELECT COUNT(*) c FROM personnel'),
    safeCount("SELECT COUNT(*) c FROM outbound_record WHERE date >= date('now','-30 days')"),
    safeCount('SELECT COUNT(*) c FROM adverse_event'),
  ]);

  const pendingAdverseAll = pendingAdverse + adverseTotal;

  // 兼容 Dashboard.vue 现有 15 字段名 + 7 个新字段（P2 用）
  const data = {
    // 旧字段（Dashboard.vue 直接读）
    total_devices: totalDevices,
    in_use: inUse,
    expiring: expiring,
    pending_repairs: pendingRepairs,
    pending_adverse: pendingAdverse,
    pending_plans: pendingPlans,
    pending_recall: pendingRecall,
    cert_expiring: certExpiring,
    cert_expired: certExpired,
    low_stock: lowStock,
    today_outbound: todayOutbound,
    total_inventory_qty: totalInventory,
    total_personnel: totalPersonnel,
    value: totalDevices, // Dashboard 卡片内复用
    // 新字段（API 扩展）
    equipment_count: totalDevices,
    inventory_count: totalInventory,
    outbound_count: outbound30d,
    adverse_event_count: pendingAdverseAll,
    expiry_warning_count: expiring,
    pending_approval_count: 0,
  };

  return res.json(success(data, '统计加载完成'));
}

/**
 * GET /api/dashboard/trends
 * P1: 占位返回 6 个月空数据；P2 接真实趋势表后实现
 */
async function trends(req, res) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      inbound: 0,
      outbound: 0,
      purchase: 0,
    });
  }
  return res.json(success(months));
}

module.exports = { stats, trends };
