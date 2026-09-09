const bcrypt = require('bcryptjs');
const db = require('../db');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');

/**
 * GET /api/user/roles/all
 */
async function listRoles(req, res) {
  const rows = await db.all('SELECT id, code, name, description FROM roles ORDER BY rank DESC');
  return res.json(success(rows));
}

/**
 * GET /api/user?page=1&size=20&keyword=xxx
 */
async function listUsers(req, res) {
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

  const total = (await db.get(`SELECT COUNT(*) c FROM users ${where}`, params)).c;
  const rows = await db.all(
    `SELECT id, username, name, dept, role_code, role, phone, email, status, last_login_at, created_at
     FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  );

  return res.json(success({ list: rows, total, page, size }));
}

/**
 * POST /api/user
 * body: { username, password, name, dept, role_code, phone, email }
 */
async function createUser(req, res) {
  const { username, password, name, dept, role_code, phone, email } = req.body;

  if (!username || !password || !name || !role_code) {
    return res.json(fail('请填写完整：用户名/密码/姓名/角色'));
  }

  const exists = await db.get('SELECT 1 AS one FROM users WHERE username = ?', [username]);
  if (exists) return res.json(fail('用户名已存在'));

  // 角色名查找
  const role = await db.get('SELECT name FROM roles WHERE code = ?', [role_code]);
  if (!role) return res.json(fail('角色不存在'));

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    `INSERT INTO users (username, password_hash, name, dept, role_code, role, phone, email, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '启用')`,
    [username, hash, name, dept || '', role_code, role.name, phone || '', email || '']
  );

  auditLog('CREATE_USER', req.userId, String(info.insertId), { username });
  return res.json(success({ id: info.insertId }, '用户创建成功'));
}

/**
 * PUT /api/user/:id
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, dept, role_code, phone, email, status } = req.body;

  // 普通用户只能改自己；admin 可改任意
  const targetId = parseInt(id, 10);
  if (req.userRoleCode !== 'sys_admin' && req.userId !== targetId) {
    return res.json(fail('无权操作其他用户'));
  }

  const user = await db.get('SELECT id, role_code FROM users WHERE id = ?', [targetId]);
  if (!user) return res.json(fail('用户不存在'));

  let roleName = null;
  if (role_code && role_code !== user.role_code) {
    if (req.userRoleCode !== 'sys_admin') {
      return res.json(fail('无权修改用户角色'));
    }
    const r = await db.get('SELECT name FROM roles WHERE code = ?', [role_code]);
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

  await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  auditLog('UPDATE_USER', req.userId, String(targetId));
  return res.json(success(null, '用户已更新'));
}

/**
 * DELETE /api/user/:id
 */
async function deleteUser(req, res) {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.userId) return res.json(fail('不能删除自己'));
  if (req.userRoleCode !== 'sys_admin') return res.json(fail('仅系统管理员可删除用户'));

  const info = await db.run('DELETE FROM users WHERE id = ?', [targetId]);
  if (info.changes === 0) return res.json(fail('用户不存在'));

  auditLog('DELETE_USER', req.userId, String(targetId));
  return res.json(success(null, '用户已删除'));
}

/**
 * PUT /api/user/:id/reset-password
 * body: { newPassword } — 仅系统管理员可重置任意用户密码
 */
async function resetPassword(req, res) {
  const targetId = parseInt(req.params.id, 10);
  if (req.userRoleCode !== 'sys_admin') return res.json(fail('仅系统管理员可重置密码'));

  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) return res.json(fail('新密码至少6位'));

  const u = await db.get('SELECT id FROM users WHERE id = ?', [targetId]);
  if (!u) return res.json(fail('用户不存在'));

  const hash = bcrypt.hashSync(String(newPassword), 10);
  await db.run(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [hash, targetId]
  );
  auditLog('RESET_PASSWORD', req.userId, String(targetId));
  return res.json(success(null, '密码已重置'));
}

module.exports = { listRoles, listUsers, createUser, updateUser, deleteUser, resetPassword };
