const bcrypt = require('bcryptjs');
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');

/**
 * GET /api/user/roles/all
 */
function listRoles(req, res) {
  const rows = db.prepare('SELECT id, code, name, description FROM roles ORDER BY rank DESC').all();
  return res.json(success(rows));
}

/**
 * GET /api/user?page=1&size=20&keyword=xxx
 */
function listUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(100, Math.max(1, parseInt(req.query.size || '20', 10)));
  const keyword = (req.query.keyword || '').trim();
  const offset = (page - 1) * size;

  let where = 'WHERE 1=1';
  const params = [];
  if (keyword) {
    where += ' AND (username LIKE ? OR name LIKE ? OR phone LIKE ?)';
    const k = `%${keyword}%`;
    params.push(k, k, k);
  }

  const total = db.prepare(`SELECT COUNT(*) c FROM users ${where}`).get(...params).c;
  const rows = db
    .prepare(
      `SELECT id, username, name, dept, role_code, role, phone, email, status, last_login_at, created_at
       FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, size, offset);

  return res.json(success({ list: rows, total, page, size }));
}

/**
 * POST /api/user
 * body: { username, password, name, dept, role_code, phone, email }
 */
function createUser(req, res) {
  const { username, password, name, dept, role_code, phone, email } = req.body;

  if (!username || !password || !name || !role_code) {
    return res.json(fail('请填写完整：用户名/密码/姓名/角色'));
  }

  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return res.json(fail('用户名已存在'));

  // 角色名查找
  const role = db.prepare('SELECT name FROM roles WHERE code = ?').get(role_code);
  if (!role) return res.json(fail('角色不存在'));

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, name, dept, role_code, role, phone, email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '启用')`
    )
    .run(username, hash, name, dept || '', role_code, role.name, phone || '', email || '');

  auditLog('CREATE_USER', req.userId, String(info.lastInsertRowid), { username });
  return res.json(success({ id: info.lastInsertRowid }, '用户创建成功'));
}

/**
 * PUT /api/user/:id
 */
function updateUser(req, res) {
  const { id } = req.params;
  const { name, dept, role_code, phone, email, status } = req.body;

  // 普通用户只能改自己；admin 可改任意
  const targetId = parseInt(id, 10);
  if (req.userRoleCode !== 'sys_admin' && req.userId !== targetId) {
    return res.json(fail('无权操作其他用户'));
  }

  const user = db.prepare('SELECT id, role_code FROM users WHERE id = ?').get(targetId);
  if (!user) return res.json(fail('用户不存在'));

  let roleName = null;
  if (role_code && role_code !== user.role_code) {
    if (req.userRoleCode !== 'sys_admin') {
      return res.json(fail('无权修改用户角色'));
    }
    const r = db.prepare('SELECT name FROM roles WHERE code = ?').get(role_code);
    if (!r) return res.json(fail('角色不存在'));
    roleName = r.name;
  }

  // 动态 SQL
  const fields = [];
  const params = [];
  if (name !== undefined)    { fields.push('name = ?'); params.push(name); }
  if (dept !== undefined)    { fields.push('dept = ?'); params.push(dept); }
  if (phone !== undefined)   { fields.push('phone = ?'); params.push(phone); }
  if (email !== undefined)   { fields.push('email = ?'); params.push(email); }
  if (status !== undefined && req.userRoleCode === 'sys_admin') { fields.push('status = ?'); params.push(status); }
  if (role_code !== undefined) { fields.push('role_code = ?'); params.push(role_code); }
  if (roleName !== null)     { fields.push('role = ?'); params.push(roleName); }

  if (fields.length === 0) return res.json(fail('没有要修改的字段'));

  fields.push("updated_at = datetime('now','localtime')");
  params.push(targetId);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  auditLog('UPDATE_USER', req.userId, String(targetId));
  return res.json(success(null, '用户已更新'));
}

/**
 * DELETE /api/user/:id
 */
function deleteUser(req, res) {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.userId) return res.json(fail('不能删除自己'));
  if (req.userRoleCode !== 'sys_admin') return res.json(fail('仅系统管理员可删除用户'));

  const info = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  if (info.changes === 0) return res.json(fail('用户不存在'));

  auditLog('DELETE_USER', req.userId, String(targetId));
  return res.json(success(null, '用户已删除'));
}

module.exports = { listRoles, listUsers, createUser, updateUser, deleteUser };