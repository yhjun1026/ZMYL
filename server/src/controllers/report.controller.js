/**
 * 报表中心 —— 对齐数据包 /api/reports/*
 * 1. GET /api/reports/export/:type  Excel(.xlsx) 导出（7 类）
 * 2. GET /api/reports/summary       采购-库存-销售-财务 统计汇总
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');

function nowFull() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

// 报表定义：type -> { sheet, sql, headers }（列名即表头，顺序即列序）
const REPORTS = {
  'equipments': {
    sheet: '设备台账',
    sql: `SELECT udi, "name", model, cls, cert, factory, "date", status, customer_name,
                 production_date, service_life, serial_no, qty, sale_price
            FROM equip_ledger WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['UDI', '名称', '型号', '分类', '注册证号', '厂家', '启用日期', '状态', '客户单位', '生产日期', '使用年限', '序列号', '数量', '销售单价(元)'],
    fields: ['udi', 'name', 'model', 'cls', 'cert', 'factory', 'date', 'status', 'customer_name', 'production_date', 'service_life', 'serial_no', 'qty', 'sale_price'],
  },
  'purchase-plans': {
    sheet: '采购计划',
    sql: `SELECT plan_no, "name", spec_model, qty, budget, category, customer_name, factory_name,
                 prod_license_no, reg_cert_no, applicant, status, "date"
            FROM purchase_plan WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['计划编号', '产品名称', '规格型号', '数量', '预算', '类别', '使用客户名称', '生产厂家', '生产许可证', '器械注册证', '申请人', '状态', '日期'],
    fields: ['plan_no', 'name', 'spec_model', 'qty', 'budget', 'category', 'customer_name', 'factory_name', 'prod_license_no', 'reg_cert_no', 'applicant', 'status', 'date'],
  },
  'inventory': {
    sheet: '库存清单',
    sql: `SELECT udi, "name", spec, batch, qty, unit, min_stock, location, status
            FROM inventory WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['UDI', '名称', '规格', '批号', '数量', '单位', '最低库存', '存放位置', '状态'],
    fields: ['udi', 'name', 'spec', 'batch', 'qty', 'unit', 'min_stock', 'location', 'status'],
  },
  'outbound': {
    sheet: '销售出库',
    sql: `SELECT order_no, customer, equip_name, equip_udi, batch, factory_name, prod_license_no,
                 qty, unit, price, total, "date", status, print_count
            FROM outbound_record WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['出库单号', '客户', '设备名称', 'UDI', '批号', '生产厂家', '生产许可证号', '数量', '单位', '单价', '总额', '日期', '状态', '打印次数'],
    fields: ['order_no', 'customer', 'equip_name', 'equip_udi', 'batch', 'factory_name', 'prod_license_no', 'qty', 'unit', 'price', 'total', 'date', 'status', 'print_count'],
  },
  'suppliers': {
    sheet: '供应商档案',
    sql: `SELECT "name", code, type, med_biz_license_no, license_expire, class2_filing_no,
                 auth_period, rating, workflow_status, contact, phone, status
            FROM supplier WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['名称', '编码', '类型', '医疗器械经营许可证号', '许可证有效期', '二类备案凭证号', '授权期限', '评级', '审核状态', '联系人', '电话', '状态'],
    fields: ['name', 'code', 'type', 'med_biz_license_no', 'license_expire', 'class2_filing_no', 'auth_period', 'rating', 'workflow_status', 'contact', 'phone', 'status'],
  },
  'personnel': {
    sheet: '员工档案',
    sql: `SELECT "name", dept, position, cert, cert_no, expire, train, status
            FROM personnel WHERE deleted = 0 ORDER BY id DESC`,
    headers: ['姓名', '部门', '岗位', '资格证', '证号', '有效期', '培训状态', '状态'],
    fields: ['name', 'dept', 'position', 'cert', 'cert_no', 'expire', 'train', 'status'],
  },
  'finance': {
    sheet: '财务记录',
    sql: `SELECT category, type, amount, "date", ref_no, dept, operator, note
            FROM finance_record WHERE deleted = 0 ORDER BY "date" DESC`,
    headers: ['类别', '类型', '金额', '日期', '关联单号', '部门', '操作人', '备注'],
    fields: ['category', 'type', 'amount', 'date', 'ref_no', 'dept', 'operator', 'note'],
  },
};

/**
 * GET /api/reports/export/:type   -> .xlsx 文件流
 * 权限：sys_admin / quality_mgr（对齐数据包 require_role）
 */
async function exportReport(req, res) {
  const { type } = req.params;
  if (!['sys_admin', 'quality_mgr'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无导出权限（需质量负责人）', 403));
  }
  const def = REPORTS[type];
  if (!def) {
    return res.status(400).json(fail(`不支持的报表类型（支持: ${Object.keys(REPORTS).join(', ')}）`, 400));
  }

  const rows = await db.all(def.sql);
  const XLSX = require('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([def.headers, ...rows.map((r) => def.fields.map((f) => r[f] ?? ''))]);
  ws['!cols'] = def.fields.map((f) => ({ wch: f === 'note' || f === 'content' ? 40 : 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.sheet);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  auditLog('REPORT_EXPORT', req.userId, type, { rows: rows.length });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${def.sheet}_${nowFull().slice(0, 10)}.xlsx`)}`);
  return res.send(buf);
}

/** 报表类型清单（前端渲染导出按钮用） */
async function listReports(req, res) {
  return res.json(success(
    Object.entries(REPORTS).map(([type, def]) => ({ type, label: def.sheet }))
  ));
}

/**
 * GET /api/reports/summary   采购-库存-销售-财务 统计
 */
async function summary(req, res) {
  const monthStart = (n) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const months = [5, 4, 3, 2, 1, 0].map(monthStart);

  const [totals] = await Promise.all([
    (async () => {
      const stockQty = await db.get('SELECT COALESCE(SUM(qty), 0) v FROM inventory WHERE deleted = 0');
      const lowStock = await db.get('SELECT COUNT(*) v FROM inventory WHERE deleted = 0 AND qty < min_stock');
      const salesDone = await db.get("SELECT COUNT(*) v, COALESCE(SUM(total), 0) amt FROM outbound_record WHERE deleted = 0 AND status = '已出库'");
      const salesPending = await db.get("SELECT COUNT(*) v FROM outbound_record WHERE deleted = 0 AND status LIKE '待%'");
      const purchaseDone = await db.get("SELECT COALESCE(SUM(amount), 0) amt FROM proc_equipment WHERE deleted = 0 AND workflow_status = '已入库'");
      const purchaseDoneC = await db.get("SELECT COALESCE(SUM(amount), 0) amt FROM proc_consumable WHERE deleted = 0 AND workflow_status = '已入库'");
      const financeIn = await db.get("SELECT COALESCE(SUM(amount), 0) v FROM finance_record WHERE deleted = 0 AND category = '收入'");
      const financeOut = await db.get("SELECT COALESCE(SUM(amount), 0) v FROM finance_record WHERE deleted = 0 AND category = '支出'");
      return {
        库存总量: stockQty.v,
        低库存品类数: lowStock.v,
        已出库单数: salesDone.v,
        销售总额: salesDone.amt,
        待审批出库单: salesPending.v,
        采购入库总额: (purchaseDone.amt || 0) + (purchaseDoneC.amt || 0),
        财务收入合计: financeIn.v,
        财务支出合计: financeOut.v,
      };
    })(),
  ]);

  // 近 6 个月月度趋势（按日期前缀匹配，兼容 TEXT 日期）
  const monthly = [];
  for (const m of months) {
    const [purE, purC, sal, fin] = await Promise.all([
      db.get('SELECT COALESCE(SUM(amount), 0) v FROM proc_equipment WHERE deleted = 0 AND substr("date", 1, 7) = ?', [m]),
      db.get('SELECT COALESCE(SUM(amount), 0) v FROM proc_consumable WHERE deleted = 0 AND substr("date", 1, 7) = ?', [m]),
      db.get("SELECT COALESCE(SUM(total), 0) v FROM outbound_record WHERE deleted = 0 AND status = '已出库' AND substr(\"date\", 1, 7) = ?", [m]),
      db.get(`SELECT
                COALESCE(SUM(CASE WHEN category = '收入' THEN amount ELSE 0 END), 0) AS inc,
                COALESCE(SUM(CASE WHEN category = '支出' THEN amount ELSE 0 END), 0) AS exp
              FROM finance_record WHERE deleted = 0 AND substr("date", 1, 7) = ?`, [m]),
    ]);
    monthly.push({
      month: m,
      采购金额: (purE ? purE.v : 0) + (purC ? purC.v : 0),
      销售金额: sal.v,
      财务收入: fin.inc,
      财务支出: fin.exp,
    });
  }

  return res.json(success({ totals, monthly }));
}

module.exports = { exportReport, listReports, summary, REPORTS };
