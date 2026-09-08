/**
 * 物流进度追踪 —— 对齐数据包 app.py 物流进度追踪 API
 *
 * 承运商档案 → 物流单（关联采购/出库）→ 轨迹节点时间轴
 * 冷链单自动串联冷链温度记录与报警统计
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { pushNotification } = require('../utils/notify');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}
function displayName(req) {
  return req.user.name || req.user.username;
}

const STATUS_NAME = {
  pending: '待发货', shipped: '已发运', in_transit: '运输中',
  arrived: '已到达', signed: '已签收', exception: '异常',
};
const MODE_NAME = { cold_chain: '冷链车', normal: '常温车', air: '航空', railway: '铁路', express: '快递' };
const NODE_PROGRESS = { received: 10, loaded: 25, shipped: 35, transit: 60, arrived: 85, delivering: 92, signed: 100, exception: 0 };
const NODE_STATUS_MAP = { shipped: 'shipped', transit: 'in_transit', arrived: 'arrived', delivering: 'in_transit', signed: 'signed', exception: 'exception', received: 'pending', loaded: 'pending' };

function orderToDict(o) {
  return {
    ...o,
    status_name: STATUS_NAME[o.status] || o.status,
    transport_mode_name: MODE_NAME[o.transport_mode] || o.transport_mode,
  };
}

async function nextLogisticsNo() {
  const today = nowStr().slice(0, 10).replace(/-/g, '');
  const c = await db.get("SELECT COUNT(*) AS c FROM logistics_order WHERE logistics_no LIKE ?", [`WL-${today}-%`]);
  return `WL-${today}-${String((c ? c.c : 0) + 1).padStart(3, '0')}`;
}

/** 冷链单自动汇总温度极值与报警数 */
async function refreshColdChainSummary(orderId) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ?', [orderId]);
  if (!o || !o.is_cold_chain) return;
  const agg = await db.get(
    `SELECT MAX(temp) AS tmax, MIN(temp) AS tmin, COUNT(*) AS c FROM cold_chain_record
      WHERE logistics_id = ? AND deleted = 0`, [orderId]
  );
  const alarms = await db.get(
    'SELECT COUNT(*) AS c FROM cold_chain_alarm WHERE logistics_id = ? AND deleted = 0', [orderId]
  );
  await db.run('UPDATE logistics_order SET temp_max = ?, temp_min = ?, alarm_count = ? WHERE id = ?',
    [agg && agg.c ? agg.tmax : 0, agg && agg.c ? agg.tmin : 0, alarms ? alarms.c : 0, orderId]);
}

// ==================== 承运商 ====================

/** GET /api/logistics/carriers */
async function listCarriers(req, res) {
  const rows = await db.all("SELECT * FROM logistics_carrier WHERE deleted = 0 AND status = 'active' ORDER BY id DESC");
  return res.json(success({ list: rows, total: rows.length }));
}

/** POST /api/logistics/carriers */
async function createCarrier(req, res) {
  const b = req.body || {};
  if (!b.name) return res.status(400).json(fail('承运商名称必填', 400));
  const info = await db.run(
    `INSERT INTO logistics_carrier (carrier_code, name, contact, phone, license_no,
       cold_chain_qualified, qualification_expire, service_scope, remark, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [b.carrier_code || '', b.name, b.contact || '', b.phone || '', b.license_no || '',
      b.cold_chain_qualified ? 1 : 0, b.qualification_expire || '', b.service_scope || '', b.remark || '']
  );
  auditLog('LOG_CARRIER_CREATE', req.userId, `logistics_carrier#${info.insertId}`, { name: b.name });
  return res.status(201).json(success({ id: info.insertId }, '承运商创建成功'));
}

/** PUT /api/logistics/carriers/:id */
async function updateCarrier(req, res) {
  const c = await db.get('SELECT * FROM logistics_carrier WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!c) return res.status(404).json(fail('承运商不存在', 404));
  const b = req.body || {};
  const fields = ['carrier_code', 'name', 'contact', 'phone', 'license_no', 'qualification_expire', 'service_scope', 'remark', 'status'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`"${f}" = ?`); params.push(b[f]); }
  }
  if (b.cold_chain_qualified !== undefined) { sets.push('cold_chain_qualified = ?'); params.push(b.cold_chain_qualified ? 1 : 0); }
  if (!sets.length) return res.status(400).json(fail('无可更新字段', 400));
  sets.push("updated_at = datetime('now','localtime')");
  params.push(c.id);
  await db.run(`UPDATE logistics_carrier SET ${sets.join(', ')} WHERE id = ?`, params);
  return res.json(success(null, '承运商已更新'));
}

/** DELETE /api/logistics/carriers/:id */
async function removeCarrier(req, res) {
  const c = await db.get('SELECT * FROM logistics_carrier WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!c) return res.status(404).json(fail('承运商不存在', 404));
  await db.run('UPDATE logistics_carrier SET deleted = 1 WHERE id = ?', [c.id]);
  return res.json(success(null, `承运商「${c.name}」已删除`));
}

// ==================== 物流单 ====================

/** GET /api/logistics/orders?status=&is_cold_chain=&keyword= */
async function listOrders(req, res) {
  const { status = '', is_cold_chain = '', keyword = '', related_type = '' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (related_type) { where.push('related_type = ?'); params.push(related_type); }
  if (is_cold_chain === '1') { where.push('is_cold_chain = 1'); }
  if (keyword) {
    where.push('(logistics_no LIKE ? OR product_name LIKE ? OR carrier_name LIKE ? OR batch LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const rows = await db.all(`SELECT * FROM logistics_order WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 300`, params);
  return res.json(success({ list: rows.map(orderToDict), total: rows.length }));
}

/** POST /api/logistics/orders */
async function createOrder(req, res) {
  const b = req.body || {};
  const no = b.logistics_no || (await nextLogisticsNo());
  const dup = await db.get('SELECT id FROM logistics_order WHERE logistics_no = ? AND deleted = 0', [no]);
  if (dup) return res.status(400).json(fail(`物流单号 ${no} 已存在`, 400));

  let carrierName = b.carrier_name || '';
  if (b.carrier_id && !carrierName) {
    const c = await db.get('SELECT name FROM logistics_carrier WHERE id = ?', [b.carrier_id]);
    if (c) carrierName = c.name;
  }
  const isColdChain = b.is_cold_chain ? 1 : (b.transport_mode === 'cold_chain' ? 1 : 0);

  const orderId = await db.transaction((tx) => {
    const info = tx.run(
      `INSERT INTO logistics_order
        (logistics_no, related_type, related_id, related_no, carrier_id, carrier_name,
         driver_name, driver_phone, vehicle_no, transport_mode, is_cold_chain,
         origin, destination, product_name, spec, batch, udi, quantity,
         factory_name, customer_name, shipped_at, expected_arrival, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [no, b.related_type || 'other', b.related_id || 0, b.related_no || '',
        b.carrier_id || 0, carrierName, b.driver_name || '', b.driver_phone || '',
        b.vehicle_no || '', b.transport_mode || 'normal', isColdChain,
        b.origin || '', b.destination || '', b.product_name || '', b.spec || '',
        b.batch || '', b.udi || '', b.quantity || 0, b.factory_name || '',
        b.customer_name || '', b.shipped_at || '', b.expected_arrival || '',
        b.remark || '', displayName(req)]
    );
    // 首节点：接单
    tx.run(
      `INSERT INTO logistics_node (logistics_id, node_seq, node_code, node_name, node_time, location, operator, status, remark)
       VALUES (?, 1, 'received', '接单', ?, ?, ?, 'done', ?)`,
      [info.insertId, nowStr(), b.origin || '', displayName(req), '物流单创建']
    );
    return info.insertId;
  });

  auditLog('LOG_ORDER_CREATE', req.userId, `logistics_order#${orderId}`, { no });
  return res.status(201).json(success({ id: orderId, logistics_no: no }, `物流单 ${no} 创建成功`));
}

/** GET /api/logistics/orders/:id（含轨迹节点） */
async function getOrder(req, res) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!o) return res.status(404).json(fail('物流单不存在', 404));
  const nodes = await db.all(
    'SELECT * FROM logistics_node WHERE logistics_id = ? AND deleted = 0 ORDER BY node_seq, id', [o.id]
  );
  // 冷链单：附带最近温度记录
  let temps = [];
  if (o.is_cold_chain) {
    temps = await db.all(
      'SELECT id, temp, humid, record_time, is_abnormal, device_name FROM cold_chain_record WHERE logistics_id = ? AND deleted = 0 ORDER BY record_time DESC LIMIT 50',
      [o.id]
    );
  }
  return res.json(success({ ...orderToDict(o), nodes, cold_chain_records: temps }));
}

/** PUT /api/logistics/orders/:id（仅未签收可编辑） */
async function updateOrder(req, res) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!o) return res.status(404).json(fail('物流单不存在', 404));
  if (o.status === 'signed') return res.status(400).json(fail('已签收物流单不可编辑', 400));
  const b = req.body || {};
  const fields = ['carrier_id', 'carrier_name', 'driver_name', 'driver_phone', 'vehicle_no',
    'transport_mode', 'origin', 'destination', 'expected_arrival', 'remark'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`"${f}" = ?`); params.push(b[f]); }
  }
  if (b.is_cold_chain !== undefined) { sets.push('is_cold_chain = ?'); params.push(b.is_cold_chain ? 1 : 0); }
  if (!sets.length) return res.status(400).json(fail('无可更新字段', 400));
  sets.push("updated_at = datetime('now','localtime')");
  params.push(o.id);
  await db.run(`UPDATE logistics_order SET ${sets.join(', ')} WHERE id = ?`, params);
  return res.json(success(null, '物流单已更新'));
}

/** DELETE /api/logistics/orders/:id（仅待发货可删） */
async function removeOrder(req, res) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!o) return res.status(404).json(fail('物流单不存在', 404));
  if (o.status !== 'pending') return res.status(400).json(fail(`仅待发货状态可删除（当前: ${STATUS_NAME[o.status]}）`, 400));
  await db.run('UPDATE logistics_order SET deleted = 1 WHERE id = ?', [o.id]);
  await db.run('UPDATE logistics_node SET deleted = 1 WHERE logistics_id = ?', [o.id]);
  auditLog('LOG_ORDER_DELETE', req.userId, `logistics_order#${o.id}`, { no: o.logistics_no });
  return res.json(success(null, `物流单 ${o.logistics_no} 已删除`));
}

// ==================== 轨迹节点 ====================

/** POST /api/logistics/orders/:id/nodes  body: { node_code, node_name?, node_time?, location?, temp?, humid?, remark? } */
async function addNode(req, res) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!o) return res.status(404).json(fail('物流单不存在', 404));
  if (o.status === 'signed') return res.status(400).json(fail('已签收物流单不可追加节点', 400));

  const b = req.body || {};
  const code = b.node_code || '';
  if (!NODE_STATUS_MAP[code]) return res.status(400).json(fail(`无效节点类型，可选: ${Object.keys(NODE_STATUS_MAP).join('/')}`, 400));

  const name = b.node_name || { received: '接单', loaded: '装车', shipped: '发运', transit: '中转', arrived: '到达', delivering: '派送', signed: '签收', exception: '异常' }[code];
  const nodeTime = b.node_time || nowStr();
  const seq = ((await db.get('SELECT MAX(node_seq) AS m FROM logistics_node WHERE logistics_id = ?', [o.id])) || {}).m || 0;

  // 冷链单：节点温度写入冷链记录，便于全链条归集
  const temp = Number(b.temp || 0);
  const humid = Number(b.humid || 0);
  let abnormal = 0;
  if (o.is_cold_chain && (temp || humid)) {
    const dev = await db.get(
      "SELECT * FROM cold_chain_device WHERE deleted = 0 AND node_type = 'transport' AND status = 'normal' ORDER BY id LIMIT 1"
    );
    if (dev) {
      abnormal = (temp > dev.temp_max || temp < dev.temp_min) ? 1 : 0;
      await db.run(
        `INSERT INTO cold_chain_record
          (device_id, device_code, device_name, node_type, temp, humid, record_time,
           logistics_id, related_type, related_id, batch, udi, product_name,
           temp_min, temp_max, is_abnormal, exceed_type, source, operator, location, remark)
         VALUES (?, ?, ?, 'transport', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)`,
        [dev.id, dev.device_code, dev.device_name, temp, humid, nodeTime,
          o.id, o.related_type, o.related_id, o.batch, o.udi, o.product_name,
          dev.temp_min, dev.temp_max, abnormal,
          abnormal ? (temp > dev.temp_max ? 'temp_high' : 'temp_low') : '',
          displayName(req), b.location || '', `物流节点[${name}]随车温度`]
      );
    }
  }

  const newStatus = NODE_STATUS_MAP[code];
  const progress = NODE_PROGRESS[code] || o.progress;
  await db.transaction((tx) => {
    // 之前的 current 节点全部置为 done
    tx.run("UPDATE logistics_node SET status = 'done' WHERE logistics_id = ? AND status = 'current'", [o.id]);
    tx.run(
      `INSERT INTO logistics_node (logistics_id, node_seq, node_code, node_name, node_time, location, operator, status, temp, humid, is_abnormal, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, seq + 1, code, name, nodeTime, b.location || '', displayName(req),
        code === 'signed' || code === 'exception' ? 'done' : 'current',
        temp, humid, abnormal, b.remark || '']
    );
    const sets = ['status = ?', 'current_node = ?', 'progress = ?', "updated_at = datetime('now','localtime')"];
    const params = [newStatus, name, progress];
    if (code === 'shipped') { sets.push('shipped_at = ?'); params.push(nodeTime); }
    if (code === 'arrived') { sets.push('actual_arrival = ?'); params.push(nodeTime); }
    if (code === 'signed') { sets.push('signed_at = ?', 'signed_by = ?'); params.push(nodeTime, b.signed_by || displayName(req)); }
    params.push(o.id);
    tx.run(`UPDATE logistics_order SET ${sets.join(', ')} WHERE id = ?`, params);
  });

  await refreshColdChainSummary(o.id);
  auditLog('LOG_NODE_ADD', req.userId, `logistics_order#${o.id}`, { code, name });

  if (code === 'signed') {
    await pushNotification({
      title: `物流签收: ${o.logistics_no}`,
      content: `物流单 ${o.logistics_no}（${o.product_name}）已签收，客户:${o.customer_name || '-'}。`,
      module: '物流追踪', refNo: o.logistics_no, refId: o.id, actionType: '签收通知',
      targetRole: 'warehouse', sourceUser: displayName(req),
    });
  }
  return res.status(201).json(success({ status: newStatus, progress }, `节点[${name}]已记录，状态更新为「${STATUS_NAME[newStatus]}」`));
}

/** DELETE /api/logistics/orders/:id/nodes/:nid */
async function removeNode(req, res) {
  const n = await db.get('SELECT * FROM logistics_node WHERE id = ? AND logistics_id = ? AND deleted = 0',
    [req.params.nid, req.params.id]);
  if (!n) return res.status(404).json(fail('节点不存在', 404));
  await db.run('UPDATE logistics_node SET deleted = 1 WHERE id = ?', [n.id]);
  return res.json(success(null, `节点[${n.node_name}]已删除`));
}

/** POST /api/logistics/orders/:id/exception  body: { remark } —— 登记异常 */
async function markException(req, res) {
  const o = await db.get('SELECT * FROM logistics_order WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!o) return res.status(404).json(fail('物流单不存在', 404));
  req.params.id = o.id;
  req.body = { ...(req.body || {}), node_code: 'exception', node_name: '异常', remark: (req.body || {}).remark || '运输异常' };
  return addNode(req, res);
}

// ==================== 看板 + 查询 ====================

/** GET /api/logistics/dashboard */
async function dashboard(req, res) {
  const cnt = async (sql, params = []) => ((await db.get(sql, params)) || {}).c || 0;
  const total = await cnt('SELECT COUNT(*) AS c FROM logistics_order WHERE deleted = 0');
  const inTransit = await cnt("SELECT COUNT(*) AS c FROM logistics_order WHERE deleted = 0 AND status IN ('shipped','in_transit')");
  const pending = await cnt("SELECT COUNT(*) AS c FROM logistics_order WHERE deleted = 0 AND status = 'pending'");
  const exception = await cnt("SELECT COUNT(*) AS c FROM logistics_order WHERE deleted = 0 AND status = 'exception'");
  const coldChain = await cnt('SELECT COUNT(*) AS c FROM logistics_order WHERE deleted = 0 AND is_cold_chain = 1');
  const ccAlarm = await cnt(
    `SELECT COUNT(*) AS c FROM cold_chain_alarm a JOIN logistics_order o ON a.logistics_id = o.id
      WHERE a.deleted = 0 AND a.status = 'pending' AND o.deleted = 0`
  );
  const recent = await db.all('SELECT * FROM logistics_order WHERE deleted = 0 ORDER BY id DESC LIMIT 10');
  return res.json(success({
    summary: { total, in_transit: inTransit, pending, exception, cold_chain: coldChain, cc_pending_alarms: ccAlarm },
    recent: recent.map(orderToDict),
  }));
}

/** GET /api/logistics/trace?logistics_no= —— 按单号查轨迹（对外查询场景） */
async function trace(req, res) {
  const no = (req.query.logistics_no || '').trim();
  if (!no) return res.status(400).json(fail('请提供 logistics_no', 400));
  const o = await db.get('SELECT * FROM logistics_order WHERE logistics_no = ? AND deleted = 0', [no]);
  if (!o) return res.status(404).json(fail(`未找到物流单 ${no}`, 404));
  const nodes = await db.all(
    'SELECT * FROM logistics_node WHERE logistics_id = ? AND deleted = 0 ORDER BY node_seq, id', [o.id]
  );
  return res.json(success({ ...orderToDict(o), nodes }));
}

module.exports = {
  listCarriers, createCarrier, updateCarrier, removeCarrier,
  listOrders, createOrder, getOrder, updateOrder, removeOrder,
  addNode, removeNode, markException, dashboard, trace,
};
