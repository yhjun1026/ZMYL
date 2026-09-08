/**
 * 冷链管理 —— 对齐数据包 app.py 冷链管理 API（全链条 + IoT + 报警 + 台账）
 *
 * 链条：厂家库房(factory_warehouse) → 干线运输(transport) → 本公司库房(own_warehouse) → 客户交付(customer)
 * 数据来源：manual 手动录入 / iot 设备自动上报（api_key 认证，免登录）/ import 批量导入
 * 超标自动判定并生成报警；按批次/UDI/物流单归集生成冷链台账
 */
const crypto = require('crypto');
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { pushNotification } = require('../utils/notify');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}
function displayName(req) {
  return req.user ? (req.user.name || req.user.username) : '';
}

const NODE_TYPE_NAME = {
  factory_warehouse: '生产厂家库房', transport: '干线运输途中',
  own_warehouse: '本公司库房', customer: '客户交付',
};
const ALARM_TYPE_NAME = {
  temp_high: '温度超上限', temp_low: '温度低于下限',
  humid_high: '湿度超上限', humid_low: '湿度低于下限',
  device_offline: '设备离线', data_interrupt: '数据中断',
};
const ALARM_STATUS_NAME = { pending: '待处理', processing: '处理中', resolved: '已解决', ignored: '已忽略' };

function deviceToDict(d) {
  return {
    ...d,
    node_type_name: NODE_TYPE_NAME[d.node_type] || d.node_type,
    status_name: { normal: '正常', repairing: '维修中', disabled: '停用' }[d.status] || d.status,
    is_offline: isDeviceOffline(d),
  };
}

/** 超过 3 个上报周期（至少 30 分钟）未上报视为离线 */
function isDeviceOffline(d) {
  if (!d.last_report_at || !d.report_interval) return false;
  const last = new Date(d.last_report_at.replace(' ', 'T'));
  if (Number.isNaN(last.getTime())) return false;
  const gapMin = (Date.now() - last.getTime()) / 60000;
  return gapMin > Math.max(3 * (d.report_interval || 30), 30);
}

async function nextNo(prefix, table, column) {
  const today = nowStr().slice(0, 10).replace(/-/g, '');
  const like = `${prefix}-${today}-%`;
  const c = await db.get(`SELECT COUNT(*) AS c FROM "${table}" WHERE "${column}" LIKE ?`, [like]);
  return `${prefix}-${today}-${String((c ? c.c : 0) + 1).padStart(3, '0')}`;
}

// ==================== 设备管理 ====================

/** GET /api/cold-chain/devices */
async function listDevices(req, res) {
  const { node_type = '', status = '' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (node_type) { where.push('node_type = ?'); params.push(node_type); }
  if (status) { where.push('status = ?'); params.push(status); }
  const rows = await db.all(`SELECT * FROM cold_chain_device WHERE ${where.join(' AND ')} ORDER BY id DESC`, params);
  return res.json(success({ list: rows.map(deviceToDict), total: rows.length }));
}

/** POST /api/cold-chain/devices */
async function createDevice(req, res) {
  const b = req.body || {};
  if (!b.device_name) return res.status(400).json(fail('设备名称必填', 400));
  const code = b.device_code || `DEV-${Date.now().toString(36).toUpperCase()}`;
  const dup = await db.get('SELECT id FROM cold_chain_device WHERE device_code = ? AND deleted = 0', [code]);
  if (dup) return res.status(400).json(fail(`设备编号 ${code} 已存在`, 400));
  const apiKey = b.api_key || crypto.randomBytes(24).toString('hex');

  const info = await db.run(
    `INSERT INTO cold_chain_device
      (device_code, device_name, device_type, node_type, temp_min, temp_max, humid_min, humid_max,
       location, belong_supplier, vehicle_no, status, calibration_no, calibration_date, calibration_due,
       api_key, report_interval, offline_alarm, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, b.device_name, b.device_type || '冷藏车', b.node_type || 'own_warehouse',
      b.temp_min ?? 2.0, b.temp_max ?? 8.0, b.humid_min ?? 35.0, b.humid_max ?? 75.0,
      b.location || '', b.belong_supplier || '', b.vehicle_no || '', b.status || 'normal',
      b.calibration_no || '', b.calibration_date || '', b.calibration_due || '',
      apiKey, b.report_interval || 30, b.offline_alarm === false ? 0 : 1,
      b.remark || '', displayName(req)]
  );
  auditLog('CC_DEVICE_CREATE', req.userId, `cold_chain_device#${info.insertId}`, { code });
  const d = await db.get('SELECT * FROM cold_chain_device WHERE id = ?', [info.insertId]);
  return res.status(201).json(success({ id: info.insertId, device: deviceToDict(d) },
    `冷链设备创建成功，IoT 密钥: ${apiKey}`));
}

/** PUT /api/cold-chain/devices/:id */
async function updateDevice(req, res) {
  const d = await db.get('SELECT * FROM cold_chain_device WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!d) return res.status(404).json(fail('设备不存在', 404));
  const b = req.body || {};
  const fields = ['device_name', 'device_type', 'node_type', 'temp_min', 'temp_max', 'humid_min', 'humid_max',
    'location', 'belong_supplier', 'vehicle_no', 'status', 'calibration_no', 'calibration_date',
    'calibration_due', 'report_interval', 'remark'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`"${f}" = ?`); params.push(b[f]); }
  }
  if (b.offline_alarm !== undefined) { sets.push('offline_alarm = ?'); params.push(b.offline_alarm ? 1 : 0); }
  if (b.api_key) { sets.push('api_key = ?'); params.push(b.api_key); }
  if (!sets.length) return res.status(400).json(fail('无可更新字段', 400));
  sets.push("updated_at = datetime('now','localtime')");
  params.push(d.id);
  await db.run(`UPDATE cold_chain_device SET ${sets.join(', ')} WHERE id = ?`, params);
  auditLog('CC_DEVICE_UPDATE', req.userId, `cold_chain_device#${d.id}`, {});
  return res.json(success(null, '设备已更新'));
}

/** DELETE /api/cold-chain/devices/:id */
async function removeDevice(req, res) {
  const d = await db.get('SELECT * FROM cold_chain_device WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!d) return res.status(404).json(fail('设备不存在', 404));
  await db.run('UPDATE cold_chain_device SET deleted = 1 WHERE id = ?', [d.id]);
  auditLog('CC_DEVICE_DELETE', req.userId, `cold_chain_device#${d.id}`, { name: d.device_name });
  return res.json(success(null, `设备「${d.device_name}」已删除`));
}

// ==================== 监测记录 + 自动报警 ====================

/** 超标判定：返回 { isAbnormal, exceedType, exceedValue } */
function judgeAbnormal(temp, humid, dev) {
  if (temp > dev.temp_max) return { isAbnormal: 1, exceedType: 'temp_high', exceedValue: +(temp - dev.temp_max).toFixed(1) };
  if (temp < dev.temp_min) return { isAbnormal: 1, exceedType: 'temp_low', exceedValue: +(dev.temp_min - temp).toFixed(1) };
  if (humid && humid > dev.humid_max) return { isAbnormal: 1, exceedType: 'humid_high', exceedValue: +(humid - dev.humid_max).toFixed(1) };
  if (humid && humid < dev.humid_min) return { isAbnormal: 1, exceedType: 'humid_low', exceedValue: +(dev.humid_min - humid).toFixed(1) };
  return { isAbnormal: 0, exceedType: '', exceedValue: 0 };
}

/** 超标自动生成报警（同设备同类型 pending 报警不重复） */
async function maybeCreateAlarm(record, dev, judged) {
  if (!judged.isAbnormal) return null;
  const dup = await db.get(
    `SELECT id FROM cold_chain_alarm
      WHERE device_id = ? AND alarm_type = ? AND status IN ('pending','processing') AND deleted = 0 LIMIT 1`,
    [dev.id, judged.exceedType]
  );
  if (dup) {
    await db.run('UPDATE cold_chain_alarm SET record_id = ?, temp = ?, humid = ?, exceed_value = ? WHERE id = ?',
      [record.id, record.temp, record.humid, judged.exceedValue, dup.id]);
    return dup.id;
  }
  const alarmNo = await nextNo('LJ', 'cold_chain_alarm', 'alarm_no');
  const level = judged.exceedValue >= 2 ? 'critical' : 'warning';
  const info = await db.run(
    `INSERT INTO cold_chain_alarm
      (alarm_no, record_id, device_id, device_code, device_name, node_type, alarm_type, alarm_level,
       temp, humid, temp_min, temp_max, exceed_value, status, triggered_at,
       logistics_id, batch, udi, product_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [alarmNo, record.id, dev.id, dev.device_code, dev.device_name, dev.node_type,
      judged.exceedType, level, record.temp, record.humid, dev.temp_min, dev.temp_max,
      judged.exceedValue, nowStr(), record.logistics_id || 0, record.batch || '',
      record.udi || '', record.product_name || '']
  );
  await pushNotification({
    title: `冷链${level === 'critical' ? '严重' : ''}报警: ${dev.device_name}`,
    content: `${ALARM_TYPE_NAME[judged.exceedType]}，当前温度${record.temp}℃（阈值${dev.temp_min}~${dev.temp_max}℃），超出${judged.exceedValue}。请及时处理。`,
    module: '冷链管理', refNo: alarmNo, refId: info.insertId, actionType: '冷链报警',
    targetRole: 'quality_mgr', sourceUser: record.operator || 'IoT',
  });
  return info.insertId;
}

/** 写入一条监测记录（核心，手动/IoT 共用） */
async function insertRecord(dev, data, source, operator) {
  const temp = Number(data.temp);
  if (Number.isNaN(temp)) return { error: '温度(temp)必填且为数字' };
  const humid = Number(data.humid || 0);
  const judged = judgeAbnormal(temp, humid, dev);
  const info = await db.run(
    `INSERT INTO cold_chain_record
      (device_id, device_code, device_name, node_type, temp, humid, record_time,
       logistics_id, related_type, related_id, batch, udi, product_name,
       temp_min, temp_max, is_abnormal, exceed_type, source, operator, location, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev.id, dev.device_code, dev.device_name, dev.node_type, temp, humid,
      data.record_time || nowStr(), data.logistics_id || 0, data.related_type || '',
      data.related_id || 0, data.batch || '', data.udi || '', data.product_name || '',
      dev.temp_min, dev.temp_max, judged.isAbnormal, judged.exceedType,
      source, operator || '', data.location || dev.location || '', data.remark || '']
  );
  await db.run("UPDATE cold_chain_device SET last_report_at = ? WHERE id = ?", [data.record_time || nowStr(), dev.id]);
  const record = await db.get('SELECT * FROM cold_chain_record WHERE id = ?', [info.insertId]);
  const alarmId = await maybeCreateAlarm(record, dev, judged);
  return { record, alarmId, judged };
}

/** GET /api/cold-chain/records?device_id=&batch=&udi=&logistics_id=&abnormal=1&date_from=&date_to= */
async function listRecords(req, res) {
  const { device_id = '', batch = '', udi = '', logistics_id = '', abnormal = '', date_from = '', date_to = '', limit = '200' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (device_id) { where.push('device_id = ?'); params.push(Number(device_id)); }
  if (batch) { where.push('batch = ?'); params.push(batch); }
  if (udi) { where.push('udi = ?'); params.push(udi); }
  if (logistics_id) { where.push('logistics_id = ?'); params.push(Number(logistics_id)); }
  if (abnormal === '1') { where.push('is_abnormal = 1'); }
  if (date_from) { where.push('record_time >= ?'); params.push(date_from); }
  if (date_to) { where.push('record_time <= ?'); params.push(date_to + ' 23:59'); }
  const rows = await db.all(
    `SELECT * FROM cold_chain_record WHERE ${where.join(' AND ')} ORDER BY record_time DESC, id DESC LIMIT ?`,
    [...params, Math.min(Number(limit) || 200, 1000)]
  );
  return res.json(success({ list: rows, total: rows.length }));
}

/** POST /api/cold-chain/records（手动录入） */
async function createRecord(req, res) {
  const b = req.body || {};
  const dev = await db.get('SELECT * FROM cold_chain_device WHERE id = ? AND deleted = 0', [b.device_id || 0]);
  if (!dev) return res.status(400).json(fail('请指定有效的冷链设备(device_id)', 400));
  if (dev.status === 'disabled') return res.status(400).json(fail('设备已停用，不能录入记录', 400));
  const r = await insertRecord(dev, b, 'manual', displayName(req));
  if (r.error) return res.status(400).json(fail(r.error, 400));
  auditLog('CC_RECORD_CREATE', req.userId, `cold_chain_record#${r.record.id}`, { abnormal: r.judged.isAbnormal });
  return res.status(201).json(success({
    id: r.record.id, is_abnormal: r.judged.isAbnormal, exceed_type: r.judged.exceedType, alarm_id: r.alarmId,
  }, r.judged.isAbnormal ? '记录已保存，检测到超标并生成报警' : '记录已保存'));
}

/** POST /api/cold-chain/records/batch  body: { device_id, records: [{temp, humid, record_time...}] } */
async function batchRecords(req, res) {
  const b = req.body || {};
  const dev = await db.get('SELECT * FROM cold_chain_device WHERE id = ? AND deleted = 0', [b.device_id || 0]);
  if (!dev) return res.status(400).json(fail('请指定有效的冷链设备(device_id)', 400));
  const items = Array.isArray(b.records) ? b.records.slice(0, 500) : [];
  if (!items.length) return res.status(400).json(fail('records 不能为空', 400));
  let ok = 0, abnormal = 0;
  for (const item of items) {
    const r = await insertRecord(dev, item, 'import', displayName(req));
    if (!r.error) { ok += 1; if (r.judged.isAbnormal) abnormal += 1; }
  }
  return res.json(success({ saved: ok, abnormal }, `批量导入 ${ok}/${items.length} 条，超标 ${abnormal} 条`));
}

// ==================== IoT 上报（api_key 认证，免登录） ====================

async function authDeviceByKey(req) {
  const key = req.headers['x-api-key'] || (req.body || {}).api_key || req.query.api_key || '';
  if (!key) return null;
  return db.get('SELECT * FROM cold_chain_device WHERE api_key = ? AND deleted = 0', [String(key)]);
}

/** POST /api/cold-chain/iot/report  body: { api_key, temp, humid, record_time?, batch?, udi?, logistics_id? } */
async function iotReport(req, res) {
  const dev = await authDeviceByKey(req);
  if (!dev) return res.status(401).json(fail('IoT 认证失败：api_key 无效', 401));
  if (dev.status === 'disabled') return res.status(403).json(fail('设备已停用', 403));
  const r = await insertRecord(dev, req.body || {}, 'iot', dev.device_code);
  if (r.error) return res.status(400).json(fail(r.error, 400));
  return res.status(201).json(success({
    id: r.record.id, is_abnormal: r.judged.isAbnormal, exceed_type: r.judged.exceedType, alarm_id: r.alarmId,
  }, 'ok'));
}

/** POST /api/cold-chain/iot/batch-report  body: { api_key, records: [...] } */
async function iotBatchReport(req, res) {
  const dev = await authDeviceByKey(req);
  if (!dev) return res.status(401).json(fail('IoT 认证失败：api_key 无效', 401));
  const items = Array.isArray((req.body || {}).records) ? req.body.records.slice(0, 500) : [];
  if (!items.length) return res.status(400).json(fail('records 不能为空', 400));
  let ok = 0, abnormal = 0;
  for (const item of items) {
    const r = await insertRecord(dev, item, 'iot', dev.device_code);
    if (!r.error) { ok += 1; if (r.judged.isAbnormal) abnormal += 1; }
  }
  return res.json(success({ saved: ok, abnormal }, 'ok'));
}

// ==================== 报警闭环 ====================

/** GET /api/cold-chain/alarms?status=&level=&device_id= */
async function listAlarms(req, res) {
  const { status = '', level = '', device_id = '' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (level) { where.push('alarm_level = ?'); params.push(level); }
  if (device_id) { where.push('device_id = ?'); params.push(Number(device_id)); }
  const rows = await db.all(`SELECT * FROM cold_chain_alarm WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 500`, params);
  return res.json(success({
    list: rows.map((a) => ({
      ...a,
      alarm_type_name: ALARM_TYPE_NAME[a.alarm_type] || a.alarm_type,
      alarm_level_name: { warning: '预警', critical: '严重' }[a.alarm_level] || a.alarm_level,
      status_name: ALARM_STATUS_NAME[a.status] || a.status,
    })),
    total: rows.length,
  }));
}

/** POST /api/cold-chain/alarms/:id/handle  body: { status: 'processing'|'resolved'|'ignored', handle_action, handle_result } */
async function handleAlarm(req, res) {
  const a = await db.get('SELECT * FROM cold_chain_alarm WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!a) return res.status(404).json(fail('报警不存在', 404));
  const b = req.body || {};
  const status = ['processing', 'resolved', 'ignored'].includes(b.status) ? b.status : 'resolved';
  await db.run(
    `UPDATE cold_chain_alarm SET status = ?, handler = ?, handler_id = ?, handled_at = ?,
       handle_action = ?, handle_result = ? WHERE id = ?`,
    [status, displayName(req), req.userId, nowStr(), b.handle_action || '', b.handle_result || '', a.id]
  );
  auditLog('CC_ALARM_HANDLE', req.userId, `cold_chain_alarm#${a.id}`, { status });
  return res.json(success({ status }, `报警 ${a.alarm_no} 处理完成（${ALARM_STATUS_NAME[status]}）`));
}

/** GET /api/cold-chain/alarms/stats */
async function alarmStats(req, res) {
  const by = async (sql, params = []) => (await db.get(sql, params)) || {};
  const total = (await by('SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0')).c || 0;
  const pending = (await by("SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 AND status = 'pending'")).c || 0;
  const critical = (await by("SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 AND alarm_level = 'critical' AND status IN ('pending','processing')")).c || 0;
  const today = nowStr().slice(0, 10);
  const todayCount = (await by('SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 AND triggered_at >= ?', [today])).c || 0;
  const byType = await db.all(
    `SELECT alarm_type, COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 GROUP BY alarm_type`
  );
  return res.json(success({
    total, pending, critical, today: todayCount,
    by_type: byType.map((t) => ({ type: t.alarm_type, name: ALARM_TYPE_NAME[t.alarm_type] || t.alarm_type, count: t.c })),
  }));
}

/** POST /api/cold-chain/alarms/scan-offline —— 扫描离线设备并生成离线报警 */
async function scanOffline(req, res) {
  const devices = await db.all(
    "SELECT * FROM cold_chain_device WHERE deleted = 0 AND status = 'normal' AND offline_alarm = 1"
  );
  let created = 0;
  for (const d of devices) {
    if (!isDeviceOffline(d)) continue;
    const dup = await db.get(
      `SELECT id FROM cold_chain_alarm WHERE device_id = ? AND alarm_type = 'device_offline'
        AND status IN ('pending','processing') AND deleted = 0 LIMIT 1`, [d.id]
    );
    if (dup) continue;
    const alarmNo = await nextNo('LJ', 'cold_chain_alarm', 'alarm_no');
    await db.run(
      `INSERT INTO cold_chain_alarm (alarm_no, device_id, device_code, device_name, node_type,
         alarm_type, alarm_level, status, triggered_at, remark)
       VALUES (?, ?, ?, ?, ?, 'device_offline', 'warning', 'pending', ?, ?)`,
      [alarmNo, d.id, d.device_code, d.device_name, d.node_type, nowStr(),
        `超过 ${Math.max(3 * (d.report_interval || 30), 30)} 分钟未上报数据`]
    );
    created += 1;
  }
  return res.json(success({ created, scanned: devices.length }, `扫描 ${devices.length} 台设备，新增离线报警 ${created} 条`));
}

// ==================== 冷链台账 ====================

/** GET /api/cold-chain/ledgers */
async function listLedgers(req, res) {
  const rows = await db.all('SELECT * FROM cold_chain_ledger WHERE deleted = 0 ORDER BY id DESC LIMIT 200');
  return res.json(success({
    list: rows.map((l) => ({ ...l, is_qualified_name: l.is_qualified ? '合格' : '不合格' })),
    total: rows.length,
  }));
}

/** GET /api/cold-chain/ledgers/:id */
async function getLedger(req, res) {
  const l = await db.get('SELECT * FROM cold_chain_ledger WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!l) return res.status(404).json(fail('台账不存在', 404));
  return res.json(success({ ...l, is_qualified_name: l.is_qualified ? '合格' : '不合格' }));
}

/** POST /api/cold-chain/ledgers/generate  body: { batch? | udi? | logistics_id? } —— 按批次/UDI/物流单归集全链条记录 */
async function generateLedger(req, res) {
  const b = req.body || {};
  const batch = (b.batch || '').trim();
  const udi = (b.udi || '').trim();
  const lid = Number(b.logistics_id || 0);
  if (!batch && !udi && !lid) return res.status(400).json(fail('请提供批次号、UDI 或物流单ID之一', 400));

  const where = ['deleted = 0'];
  const params = [];
  if (batch) { where.push('batch = ?'); params.push(batch); }
  if (udi) { where.push('udi = ?'); params.push(udi); }
  if (lid) { where.push('logistics_id = ?'); params.push(lid); }
  const records = await db.all(
    `SELECT * FROM cold_chain_record WHERE ${where.join(' AND ')} ORDER BY record_time`, params
  );
  if (!records.length) return res.status(404).json(fail('未找到该批次/UDI/物流单的冷链监测记录，无法生成台账', 404));

  const aw = ['deleted = 0'];
  const ap = [];
  if (batch) { aw.push('batch = ?'); ap.push(batch); }
  if (udi) { aw.push('udi = ?'); ap.push(udi); }
  if (lid) { aw.push('logistics_id = ?'); ap.push(lid); }
  const alarms = await db.all(`SELECT * FROM cold_chain_alarm WHERE ${aw.join(' AND ')}`, ap);

  const temps = records.map((r) => r.temp);
  const humids = records.map((r) => r.humid || 0);
  const nodes = [...new Set(records.map((r) => r.node_type))];
  const unresolved = alarms.filter((a) => ['pending', 'processing'].includes(a.status)).length;
  const first = records[0];
  const last = records[records.length - 1];
  const tempMax = Math.max(...temps);
  const tempMin = Math.min(...temps);
  const isQualified = unresolved === 0 && records.every((r) => !r.is_abnormal) ? 1 : 0;

  // 关联物流单信息
  let lo = null;
  if (lid) lo = await db.get('SELECT * FROM logistics_order WHERE id = ?', [lid]);
  if (!lo && first.logistics_id) lo = await db.get('SELECT * FROM logistics_order WHERE id = ?', [first.logistics_id]);

  const ledgerNo = await nextNo('LT', 'cold_chain_ledger', 'ledger_no');
  const conclusion = isQualified
    ? `全程${records.length}条监测记录，温度${tempMin}~${tempMax}℃，均在阈值范围内，冷链合格。`
    : `全程${records.length}条监测记录中存在超标（温度极值${tempMin}~${tempMax}℃），报警${alarms.length}次（未闭环${unresolved}次），冷链不合格，请按偏差处理流程处置。`;

  const info = await db.run(
    `INSERT INTO cold_chain_ledger
      (ledger_no, related_type, related_id, order_no, product_name, spec, batch, udi, quantity,
       factory_name, supplier_name, customer_name, logistics_id, logistics_no, covered_nodes,
       start_time, end_time, temp_max, temp_min, temp_avg, humid_avg, record_count, alarm_count,
       unresolved_alarm, is_qualified, conclusion, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ledgerNo, lo ? lo.related_type : (first.related_type || ''), lo ? lo.related_id : (first.related_id || 0),
      lo ? (lo.related_no || lo.logistics_no) : '', b.product_name || first.product_name || (lo ? lo.product_name : ''),
      b.spec || (lo ? lo.spec : '') || '', batch || first.batch || '', udi || first.udi || '',
      b.quantity || (lo ? lo.quantity : 0) || 0,
      b.factory_name || (lo ? lo.factory_name : '') || '', b.supplier_name || '',
      b.customer_name || (lo ? lo.customer_name : '') || '',
      lid || first.logistics_id || 0, lo ? lo.logistics_no : '',
      JSON.stringify(nodes), first.record_time || '', last.record_time || '',
      tempMax, tempMin, +(temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1),
      +(humids.reduce((s, t) => s + t, 0) / humids.length).toFixed(1),
      records.length, alarms.length, unresolved, isQualified, conclusion, displayName(req)]
  );
  auditLog('CC_LEDGER_GEN', req.userId, `cold_chain_ledger#${info.insertId}`, { ledgerNo, isQualified });
  return res.status(201).json(success({ id: info.insertId, ledger_no: ledgerNo, is_qualified: isQualified },
    `冷链台账生成成功（${isQualified ? '合格' : '不合格'}）`));
}

/** POST /api/cold-chain/ledgers/:id/verify —— 质管审核台账 */
async function verifyLedger(req, res) {
  if (!['sys_admin', 'quality_staff', 'quality_mgr'].includes(req.userRoleCode)) {
    return res.status(403).json(fail('无权限（需质管人员）', 403));
  }
  const l = await db.get('SELECT * FROM cold_chain_ledger WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!l) return res.status(404).json(fail('台账不存在', 404));
  await db.run('UPDATE cold_chain_ledger SET verified_by = ?, verified_at = ? WHERE id = ?',
    [displayName(req), nowStr(), l.id]);
  auditLog('CC_LEDGER_VERIFY', req.userId, `cold_chain_ledger#${l.id}`, {});
  return res.json(success(null, `台账 ${l.ledger_no} 已审核`));
}

/** GET /api/cold-chain/chain-trace?batch=|udi=|logistics_id= —— 全链条追溯视图 */
async function chainTrace(req, res) {
  const batch = (req.query.batch || '').trim();
  const udi = (req.query.udi || '').trim();
  const lid = Number(req.query.logistics_id || 0);
  if (!batch && !udi && !lid) return res.status(400).json(fail('请提供 batch / udi / logistics_id 之一', 400));
  const where = ['deleted = 0'];
  const params = [];
  if (batch) { where.push('batch = ?'); params.push(batch); }
  if (udi) { where.push('udi = ?'); params.push(udi); }
  if (lid) { where.push('logistics_id = ?'); params.push(lid); }
  const records = await db.all(`SELECT * FROM cold_chain_record WHERE ${where.join(' AND ')} ORDER BY record_time`, params);
  const aw = ['deleted = 0'];
  const ap = [];
  if (batch) { aw.push('batch = ?'); ap.push(batch); }
  if (udi) { aw.push('udi = ?'); ap.push(udi); }
  if (lid) { aw.push('logistics_id = ?'); ap.push(lid); }
  const alarms = await db.all(`SELECT * FROM cold_chain_alarm WHERE ${aw.join(' AND ')} ORDER BY id`, ap);

  // 按节点分组
  const byNode = {};
  for (const r of records) {
    if (!byNode[r.node_type]) byNode[r.node_type] = { node_type: r.node_type, node_type_name: NODE_TYPE_NAME[r.node_type] || r.node_type, count: 0, abnormal: 0, temp_max: -999, temp_min: 999, records: [] };
    const g = byNode[r.node_type];
    g.count += 1;
    if (r.is_abnormal) g.abnormal += 1;
    g.temp_max = Math.max(g.temp_max, r.temp);
    g.temp_min = Math.min(g.temp_min, r.temp);
    g.records.push(r);
  }
  return res.json(success({
    batch, udi, logistics_id: lid,
    record_count: records.length, alarm_count: alarms.length,
    nodes: Object.values(byNode),
    alarms,
  }));
}

/** GET /api/cold-chain/dashboard —— 实时看板：各节点当前温度、在线设备、今日报警 */
async function dashboard(req, res) {
  const devices = await db.all('SELECT * FROM cold_chain_device WHERE deleted = 0 ORDER BY node_type, id');
  const cards = [];
  for (const d of devices) {
    const latest = await db.get(
      'SELECT * FROM cold_chain_record WHERE device_id = ? AND deleted = 0 ORDER BY record_time DESC, id DESC LIMIT 1', [d.id]
    );
    cards.push({
      ...deviceToDict(d),
      latest_temp: latest ? latest.temp : null,
      latest_humid: latest ? latest.humid : null,
      latest_time: latest ? latest.record_time : '',
      latest_abnormal: latest ? latest.is_abnormal : 0,
    });
  }
  const today = nowStr().slice(0, 10);
  const todayAlarms = (await db.get('SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 AND triggered_at >= ?', [today]) || {}).c || 0;
  const pendingAlarms = (await db.get("SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE deleted = 0 AND status = 'pending'") || {}).c || 0;
  const todayRecords = (await db.get('SELECT COUNT(*) AS c FROM cold_chain_record WHERE deleted = 0 AND record_time >= ?', [today]) || {}).c || 0;
  const online = cards.filter((c) => !c.is_offline && c.status === 'normal').length;
  return res.json(success({
    devices: cards,
    summary: {
      device_total: cards.length, online, offline: cards.filter((c) => c.is_offline).length,
      today_alarms: todayAlarms, pending_alarms: pendingAlarms, today_records: todayRecords,
    },
  }));
}

module.exports = {
  listDevices, createDevice, updateDevice, removeDevice,
  listRecords, createRecord, batchRecords, iotReport, iotBatchReport,
  listAlarms, handleAlarm, alarmStats, scanOffline,
  listLedgers, getLedger, generateLedger, verifyLedger,
  chainTrace, dashboard,
};
