/**
 * 销售出库六级审批流 —— 对齐数据包 app.py update_outbound（GSP第59-67条 多级复核）
 *
 * 流程：录入(待销售经理审核) → 销售经理 → 质管员 → 库管员 → 质量负责人 → 销售总监 → 已出库
 * 库存联动：创建/编辑时预占库存，驳回释放，终审放行精确批次扣减 + 财务自动记账
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { pushNotification } = require('../utils/notify');

// 六级流：状态 -> 下一状态
const OUTBOUND_FLOW = ['待销售经理审核', '待质管员审核', '待库管员审核', '待质量负责人审核', '待销售总监审核', '已出库'];
// 状态 -> 可执行角色
const OUTBOUND_STEP_ROLE = {
  '待销售经理审核': 'sales_mgr',
  '待质管员审核': 'quality_staff',
  '待库管员审核': 'warehouse',
  '待质量负责人审核': 'quality_mgr',
  '待销售总监审核': 'sales_director',
};
const OUTBOUND_STEP_LABEL = {
  '待销售经理审核': '销售经理审核',
  '待质管员审核': '质管员审核',
  '待库管员审核': '库管员审核',
  '待质量负责人审核': '质量负责人审核',
  '待销售总监审核': '销售总监审核',
};
// 可编辑状态（录入方）
const EDITABLE_STATUS = ['待销售经理审核', '已驳回'];

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
  } catch { /* operation_log 缺表时忽略 */ }
}

/** 追加六级审批轨迹（JSON 数组: step/action/name/at/opinion） */
function appendTrail(ob, step, action, name, opinion = '') {
  let trail = [];
  try { trail = JSON.parse(ob.audit_trail || '[]'); } catch { trail = []; }
  trail.push({ step, action, name, at: nowStr(), opinion: opinion || '' });
  return JSON.stringify(trail);
}

// ============ 库存联动 ============

/** 按品名+批次+UDI 定位库存行 */
async function locateInventory(name, batch = '', udi = '') {
  let row = null;
  if (udi) {
    row = await db.get('SELECT * FROM inventory WHERE deleted = 0 AND udi = ? AND qty > 0 ORDER BY id DESC', [udi]);
  }
  if (!row && batch) {
    row = await db.get('SELECT * FROM inventory WHERE deleted = 0 AND "name" = ? AND batch = ? AND qty > 0 ORDER BY id DESC', [name, batch]);
  }
  if (!row) {
    row = await db.get('SELECT * FROM inventory WHERE deleted = 0 AND "name" = ? AND qty > 0 ORDER BY id DESC', [name]);
  }
  return row;
}

/** 可用量 = 库存 qty - 其它出库单已预占数量（本单除外） */
async function availableQty(inv, excludeObId = 0) {
  const r = await db.get(
    `SELECT COALESCE(SUM(reserved_qty), 0) AS r FROM outbound_record
      WHERE deleted = 0 AND inv_id = ? AND reserved_qty > 0 AND status != '已出库' AND id != ?`,
    [inv.id, excludeObId]
  );
  return (inv.qty || 0) - (r ? r.r : 0);
}

/**
 * 预占库存：写入 outbound_record.inv_id / reserved_qty
 * 返回 { ok, inv, message }
 */
async function reserveStock(ob, excludeSelf = false) {
  const inv = await locateInventory(ob.equip_name, ob.batch, ob.equip_udi);
  if (!inv) return { ok: false, inv: null, message: `库存中未找到【${ob.equip_name}】（批次${ob.batch || '不限'}）的可售记录` };
  const avail = await availableQty(inv, excludeSelf ? ob.id : 0);
  if (avail < (ob.qty || 0)) {
    return { ok: false, inv, message: `库存不足：【${ob.equip_name}】批次${inv.batch || '-'}可用 ${avail}，需 ${ob.qty}` };
  }
  await db.run('UPDATE outbound_record SET inv_id = ?, reserved_qty = ? WHERE id = ?', [inv.id, ob.qty, ob.id]);
  return { ok: true, inv, message: `已预占【${ob.equip_name}】批次${inv.batch || '-'} x${ob.qty}` };
}

/** 释放预占 */
async function releaseReservation(ob) {
  if (!ob.reserved_qty) return 0;
  await db.run('UPDATE outbound_record SET reserved_qty = 0 WHERE id = ?', [ob.id]);
  return ob.reserved_qty;
}

/** 终审扣减库存 + 记库存流水 */
async function deductStock(ob, operator) {
  const inv = await locateInventory(ob.equip_name, ob.batch, ob.equip_udi);
  if (!inv) return { ok: false, message: `出库失败：库存中未找到【${ob.equip_name}】` };
  if ((inv.qty || 0) < (ob.qty || 0)) {
    return { ok: false, message: `出库失败：【${ob.equip_name}】当前库存 ${inv.qty}，不足 ${ob.qty}` };
  }
  await db.run('UPDATE inventory SET qty = qty - ? WHERE id = ?', [ob.qty, inv.id]);
  try {
    await db.run(
      `INSERT INTO inventory_log (udi, "name", type, change_qty, before_qty, after_qty, ref_no, operator, "date", note, created_at, deleted)
       VALUES (?, ?, '出库', ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [inv.udi, inv.name, -(ob.qty || 0), inv.qty, (inv.qty || 0) - (ob.qty || 0), ob.order_no,
        operator || ob.operator || '', nowFull().slice(0, 10),
        `销售出库扣减（${ob.customer || ''}）`, nowFull()]
    );
  } catch { /* inventory_log 列不齐时忽略 */ }
  return { ok: true, inv };
}

/** 财务自动记账（收入） */
async function autoFinanceIncome(orderNo, amount, customer, note) {
  try {
    await db.run(
      `INSERT INTO finance_record (category, type, amount, "date", ref_no, dept, operator, note, created_at, deleted)
       VALUES ('收入', '销售出库', ?, ?, ?, '销售部', '', ?, ?, 0)`,
      [amount, nowFull().slice(0, 10), orderNo, note, nowFull()]
    );
  } catch { /* finance_record 列不齐时忽略 */ }
}

// ============ 六级审批 ============

/**
 * POST /api/outbound_record/:id/flow   body: { action: 'approve'|'reject', opinion }
 */
async function outboundFlow(req, res) {
  const { id } = req.params;
  const ob = await db.get('SELECT * FROM outbound_record WHERE id = ? AND deleted = 0', [id]);
  if (!ob) return res.status(404).json(fail('出库单不存在', 404));

  const { action = 'approve', opinion = '' } = req.body || {};
  const role = req.userRoleCode;
  const user = displayName(req);
  const oldStatus = ob.status;

  // 已出库不可动（GSP 留档）
  if (oldStatus === '已出库') {
    return res.status(403).json(fail('已出库单不可修改（GSP要求出库记录留档），如需冲正请新建红冲出库单', 403));
  }
  if (!(oldStatus in OUTBOUND_STEP_ROLE)) {
    return res.status(400).json(fail(`当前状态「${oldStatus}」不在审批环节中，无法审批`, 400));
  }
  const stepRole = OUTBOUND_STEP_ROLE[oldStatus];
  if (role !== stepRole && role !== 'sys_admin') {
    return res.status(403).json(
      fail(`本环节须由${OUTBOUND_STEP_LABEL[oldStatus]}对应角色（${stepRole}）执行，当前角色无权操作`, 403)
    );
  }

  // ---- 驳回：释放预占 + 通知录入方 ----
  if (action === 'reject') {
    const trail = appendTrail(ob, OUTBOUND_STEP_LABEL[oldStatus], '驳回', user, opinion);
    const released = await releaseReservation(ob);
    await db.run(
      `UPDATE outbound_record SET status = '已驳回', audit_trail = ?,
        note = ? WHERE id = ?`,
      [trail, `${(ob.note || '')}${opinion ? ` [驳回:${OUTBOUND_STEP_LABEL[oldStatus]} ${opinion}]` : ''}`.slice(0, 2000), id]
    );
    await logOp(`出库单审批驳回: ${ob.order_no}（${OUTBOUND_STEP_LABEL[oldStatus]}），释放预占${released}`, user);
    await pushNotification({
      title: `出库单被驳回: ${ob.order_no}`,
      content: `${OUTBOUND_STEP_LABEL[oldStatus]}驳回该销售单。${opinion.slice(0, 100)}`,
      module: '销售出库', refNo: ob.order_no, refId: ob.id, actionType: '审批驳回',
      targetRole: 'admin_dept', sourceUser: user,
    });
    return res.json(success({ status: '已驳回', released_qty: released },
      `已驳回（${OUTBOUND_STEP_LABEL[oldStatus]}），预占库存已释放 ${released}`));
  }

  // ---- 通过：推进 ----
  const idx = OUTBOUND_FLOW.indexOf(oldStatus);
  const nextStatus = OUTBOUND_FLOW[idx + 1];
  const trail = appendTrail(ob, OUTBOUND_STEP_LABEL[oldStatus], '通过', user, opinion);

  // 环节责任字段留痕：库管员=复核人，质量负责人=质量放行人
  const sets = { status: nextStatus, audit_trail: trail };
  if (oldStatus === '待库管员审核') sets.reviewer = user;
  if (oldStatus === '待质量负责人审核') sets.quality_approver = user;

  // ---- 终审放行：扣库存 + 自动记账 ----
  if (nextStatus === '已出库') {
    await releaseReservation(ob); // 先释放预占，还原可用口径
    const ded = await deductStock(ob, user);
    if (!ded.ok) {
      return res.status(400).json(fail(ded.message, 400));
    }
    sets.inv_id = ded.inv.id;
    sets.reserved_qty = 0;
    // 溯源：回填同库存行最近一次入库流水（若可查）
    try {
      const src = await db.get(
        'SELECT id FROM inventory_log WHERE "name" = ? AND change_qty > 0 ORDER BY id DESC LIMIT 1',
        [ob.equip_name]
      );
      if (src) sets.stock_in_id = src.id;
    } catch { /* 忽略溯源失败 */ }

    await db.run(
      `UPDATE outbound_record SET ${Object.keys(sets).map((k) => `"${k}" = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(sets), id]
    );

    if (ob.total && ob.total > 0) {
      await autoFinanceIncome(ob.order_no, ob.total, ob.customer,
        `销售出库自动记账: ${ob.equip_name} x${ob.qty} 客户:${ob.customer}`);
    }
    await logOp(`出库单六级审批完成出库: ${ob.order_no}（扣减批次${ob.batch || '按近效期'}）`, user);
    await pushNotification({
      title: `出库完成: ${ob.order_no}`,
      content: `六级审批全部通过，设备【${ob.equip_name}】已出库，数量${ob.qty}，金额${ob.total || 0}元，客户:${ob.customer}。库存已扣减，财务已自动记账。`,
      module: '销售出库', refNo: ob.order_no, refId: ob.id, actionType: '出库通知',
      targetRole: 'admin_dept', sourceUser: user,
    });
    return res.json(success({ status: '已出库' }, '销售总监终审通过，已完成出库，库存已扣减，财务已自动记账'));
  }

  // ---- 中间环节流转 ----
  await db.run(
    `UPDATE outbound_record SET ${Object.keys(sets).map((k) => `"${k}" = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(sets), id]
  );
  const nextLabel = OUTBOUND_STEP_LABEL[nextStatus];
  const stepNo = OUTBOUND_FLOW.indexOf(nextStatus) + 1;
  await logOp(`出库单审批通过: ${ob.order_no} → ${nextStatus}`, user);
  await pushNotification({
    title: `出库单待${nextLabel}: ${ob.order_no}`,
    content: `${OUTBOUND_STEP_LABEL[oldStatus]}已通过（${stepNo}/5），请${nextLabel}。`,
    module: '销售出库', refNo: ob.order_no, refId: ob.id, actionType: '待审批',
    targetRole: OUTBOUND_STEP_ROLE[nextStatus], sourceUser: user,
  });
  return res.json(success({ status: nextStatus }, `${OUTBOUND_STEP_LABEL[oldStatus]}通过，流转至「${nextStatus}」`));
}

// ============ CRUD 钩子（创建/编辑时的预占逻辑，由 crud.controller 调用） ============

/** 创建出库单前：校验并预占库存。返回 error 字符串或 null */
async function hookAfterCreate(req, row) {
  const r = await reserveStock(row);
  if (!r.ok) {
    // 库存不足：仍保留单据（草稿性质），但不预占，终审时会再次校验
    await logOp(`出库单创建（未预占库存: ${r.message}）: ${row.order_no}`, displayName(req));
    return { warning: r.message };
  }
  await pushNotification({
    title: `出库单待销售经理审核: ${row.order_no}`,
    content: `新销售出库单已录入【${row.equip_name} x${row.qty}】，请销售经理审核。（${r.message}）`,
    module: '销售出库', refNo: row.order_no, refId: row.id, actionType: '待审批',
    targetRole: 'sales_mgr', sourceUser: displayName(req),
  });
  return { warning: null, reserved: r.message };
}

/** 编辑出库单：校验可编辑状态 + 保护字段剥离。返回 error 或 null（may modify body） */
function hookBeforeUpdate(req, row, body) {
  if (!EDITABLE_STATUS.includes(row.status)) {
    return `仅"待销售经理审核/已驳回"状态的销售单可编辑（当前: ${row.status}），审批中单据不可修改内容`;
  }
  // 保护字段：审批与库存联动字段禁止从前端写入
  for (const f of ['status', 'reviewer', 'quality_approver', 'audit_trail', 'inv_id', 'reserved_qty', 'stock_in_id', 'print_count']) {
    delete body[f];
  }
  return null;
}

/** 编辑后：驳回单重提（重新预占 + 回到起点） */
async function hookAfterUpdate(req, row, before) {
  const wasRejected = before === '已驳回';
  const qtyChanged = true; // 编辑场景保守处理：重新按当前条件预占
  if (wasRejected || qtyChanged) {
    // 先清旧预占再按新条件重占
    await db.run('UPDATE outbound_record SET inv_id = 0, reserved_qty = 0 WHERE id = ?', [row.id]);
    const r = await reserveStock(row);
    if (wasRejected) {
      await db.run("UPDATE outbound_record SET status = '待销售经理审核' WHERE id = ?", [row.id]);
      const trail = appendTrail(row, '驳回后修改重提', '重提', displayName(req));
      await db.run('UPDATE outbound_record SET audit_trail = ? WHERE id = ?', [trail, row.id]);
      await pushNotification({
        title: `出库单修改重提: ${row.order_no}`,
        content: '综合行政部已修改该销售单并重新提交，请销售经理审核。',
        module: '销售出库', refNo: row.order_no, refId: row.id, actionType: '待审批',
        targetRole: 'sales_mgr', sourceUser: displayName(req),
      });
    }
    return r.ok ? { reserved: r.message } : { warning: r.message };
  }
  return {};
}

/** 出库单打印留痕 */
async function printStamp(req, res) {
  const { id } = req.params;
  const ob = await db.get('SELECT * FROM outbound_record WHERE id = ? AND deleted = 0', [id]);
  if (!ob) return res.status(404).json(fail('出库单不存在', 404));
  await db.run(
    'UPDATE outbound_record SET print_count = print_count + 1, last_print_at = ?, last_print_by = ? WHERE id = ?',
    [nowStr(), displayName(req), id]
  );
  await logOp(`打印出库单: ${ob.order_no}（第 ${(ob.print_count || 0) + 1} 次）`, displayName(req));
  return res.json(success({ print_count: (ob.print_count || 0) + 1 }, '打印留痕已记录'));
}

module.exports = {
  outboundFlow, printStamp,
  hookAfterCreate, hookBeforeUpdate, hookAfterUpdate,
  OUTBOUND_FLOW, OUTBOUND_STEP_ROLE, OUTBOUND_STEP_LABEL, EDITABLE_STATUS,
};
