/**
 * 通用 CRUD 控制器 —— 对齐老后端 routers/crud.py
 * 分页查询 / 详情 / 新增 / 更新 / 逻辑删除（GSP 已批准档案保护）
 *
 * 表结构通过 PRAGMA table_info 运行时读取并缓存（10 分钟），
 * 避免在代码里重复维护 40 张表的字段清单。
 */
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const { MODULES } = require('../config/modules');
const outbound = require('./outbound.controller'); // 出库单 CRUD 钩子（库存预占等）

// ---- 表元数据缓存: table -> { columns:Set, hasDeleted, hasWorkflowStatus } ----
const metaCache = new Map();
const META_TTL = 10 * 60 * 1000;

function getTableMeta(table) {
  const hit = metaCache.get(table);
  if (hit && Date.now() - hit.at < META_TTL) return hit;

  const cols = db.raw.prepare(`PRAGMA table_info("${table}")`).all();
  if (!cols.length) return null; // 表不存在

  const colNames = cols.map((c) => c.name);
  const meta = {
    at: Date.now(),
    columns: new Set(colNames),
    hasDeleted: colNames.includes('deleted'),
    hasWorkflowStatus: colNames.includes('workflow_status'),
  };
  metaCache.set(table, meta);
  return meta;
}

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }); // YYYY-MM-DD HH:MM:SS
}

/** 校验资源合法 + 返回元数据；不合法返回 null */
function resolveTable(table) {
  if (!Object.prototype.hasOwnProperty.call(MODULES, table)) return null;
  return getTableMeta(table);
}

/** body 白名单过滤：只保留表中存在且允许写入的列 */
function cleanPayload(meta, body, drop = ['id', 'created_at', 'updated_at', 'created_by']) {
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (meta.columns.has(k) && !drop.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * GET /api/:table?page=1&size=10&keyword=xxx
 * 响应: { total, records }（对齐前端 ModulePage）
 */
async function list(req, res) {
  const { table } = req.params;
  const meta = resolveTable(table);
  if (!meta) return res.status(404).json(fail(`未知的资源: ${table}`, 404));

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(200, Math.max(1, parseInt(req.query.size || '10', 10)));
  const keyword = (req.query.keyword || '').trim();
  const offset = (page - 1) * size;

  const where = ['1=1'];
  const params = [];
  if (meta.hasDeleted) where.push('deleted = 0');
  if (keyword) {
    const fields = (MODULES[table].searchFields || []).filter((f) => meta.columns.has(f));
    if (fields.length) {
      where.push(`(${fields.map((f) => `"${f}" LIKE ?`).join(' OR ')})`);
      const k = `%${keyword}%`;
      fields.forEach(() => params.push(k));
    }
  }
  const whereSql = where.join(' AND ');

  const total = (await db.get(`SELECT COUNT(*) AS c FROM "${table}" WHERE ${whereSql}`, params)).c;
  const records = await db.all(
    `SELECT * FROM "${table}" WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  );

  return res.json(success({ total, records }));
}

/**
 * GET /api/:table/:id
 */
async function getOne(req, res) {
  const { table, id } = req.params;
  const meta = resolveTable(table);
  if (!meta) return res.status(404).json(fail(`未知的资源: ${table}`, 404));

  const row = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id]);
  if (!row) return res.status(404).json(fail('记录不存在', 404));
  return res.json(success(row));
}

/**
 * POST /api/:table
 */
async function create(req, res) {
  const { table } = req.params;
  const meta = resolveTable(table);
  if (!meta) return res.status(404).json(fail(`未知的资源: ${table}`, 404));

  const data = cleanPayload(meta, req.body);
  if (Object.keys(data).length === 0) {
    return res.json(fail('没有可写入的字段'));
  }
  if (meta.columns.has('created_by') && !data.created_by) {
    data.created_by = req.user.username;
  }
  if (meta.columns.has('created_at') && !data.created_at) {
    data.created_at = nowStr();
  }
  if (meta.hasDeleted && data.deleted === undefined) {
    data.deleted = 0;
  }

  // 出库单默认值：单号 / 六级流起点 / 日期（P3）
  if (table === 'outbound_record') {
    if (!data.status) data.status = '待销售经理审核';
    if (!data.order_no) data.order_no = `SO-${nowStr().replace(/[-: ]/g, '').slice(0, 14)}`;
    if (!data.date) data.date = nowStr().slice(0, 10);
    if (!data.qty) data.qty = 1;
    if (!data.unit) data.unit = '台';
  }

  const cols = Object.keys(data);
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
               VALUES (${cols.map(() => '?').join(', ')})`;
  const info = await db.run(sql, cols.map((c) => data[c]));

  auditLog('CRUD_CREATE', req.userId, `${table}#${info.insertId}`, { table });

  const row = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [info.insertId]);

  // 出库单：创建后尝试预占库存（不足则提示但保留单据）
  let extra = {};
  if (table === 'outbound_record') {
    try { extra = await outbound.hookAfterCreate(req, row) || {}; } catch { extra = {}; }
  }

  // 钩子可能已更新记录（预占信息），重新取行保证响应新鲜
  const fresh = table === 'outbound_record'
    ? await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [info.insertId])
    : row;
  return res.json(success(fresh, extra.warning
    ? `新增成功（注意：${extra.warning}）`
    : (extra.reserved ? `新增成功（${extra.reserved}）` : '新增成功')));
}

/**
 * PUT /api/:table/:id
 */
async function update(req, res) {
  const { table, id } = req.params;
  const meta = resolveTable(table);
  if (!meta) return res.status(404).json(fail(`未知的资源: ${table}`, 404));

  const exists = await db.get(`SELECT id FROM "${table}" WHERE id = ?`, [id]);
  if (!exists) return res.status(404).json(fail('记录不存在', 404));

  const data = cleanPayload(meta, req.body, ['id', 'created_at', 'created_by']);
  if (Object.keys(data).length === 0) {
    return res.json(fail('没有要修改的字段'));
  }

  // 出库单：编辑保护（仅待销售经理审核/已驳回可改 + 剥离审批与库存联动字段）
  let beforeStatus = null;
  if (table === 'outbound_record') {
    const cur = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id]);
    const err = outbound.hookBeforeUpdate(req, cur, data);
    if (err) return res.status(403).json(fail(err, 403));
    beforeStatus = cur.status;
    if (Object.keys(data).length === 0) {
      return res.json(fail('没有要修改的字段（审批中单据内容不可修改）'));
    }
  }

  if (meta.columns.has('updated_by')) {
    data.updated_by = req.user.username;
  }
  if (meta.columns.has('updated_at')) {
    data.updated_at = nowStr();
  }

  const cols = Object.keys(data);
  const setSql = cols.map((c) => `"${c}" = ?`).join(', ');
  await db.run(`UPDATE "${table}" SET ${setSql} WHERE id = ?`, [...cols.map((c) => data[c]), id]);

  auditLog('CRUD_UPDATE', req.userId, `${table}#${id}`, { table });

  const row = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id]);

  // 出库单：驳回重提（重新预占 + 状态回起点）
  let extra = {};
  if (table === 'outbound_record') {
    try { extra = await outbound.hookAfterUpdate(req, row, beforeStatus) || {}; } catch { extra = {}; }
  }

  return res.json(success(
    await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id]),
    extra.warning ? `更新成功（注意：${extra.warning}）`
      : (extra.reserved ? `更新成功（${extra.reserved}）` : '更新成功')
  ));
}

/**
 * DELETE /api/:table/:id
 * GSP 留档保护：已批准档案不可删除；有 deleted 列的表走逻辑删除
 */
async function remove(req, res) {
  const { table, id } = req.params;
  const meta = resolveTable(table);
  if (!meta) return res.status(404).json(fail(`未知的资源: ${table}`, 404));

  const row = await db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id]);
  if (!row) return res.status(404).json(fail('记录不存在', 404));

  // GSP 留档保护
  if (meta.hasWorkflowStatus && row.workflow_status === '已批准') {
    return res.status(403).json(
      fail('已批准的档案不可删除（GSP要求资质档案保存至失效后2年），如需停用请修改状态为"停用"', 403)
    );
  }

  if (meta.hasDeleted) {
    await db.run(`UPDATE "${table}" SET deleted = 1 WHERE id = ?`, [id]);
  } else {
    await db.run(`DELETE FROM "${table}" WHERE id = ?`, [id]);
  }

  auditLog('CRUD_DELETE', req.userId, `${table}#${id}`, { table });
  return res.json(success(null, '删除成功'));
}

module.exports = { list, getOne, create, update, remove, getTableMeta };
