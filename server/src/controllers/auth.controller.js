const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../utils/jwt');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 * body: { username, password }
 */
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json(fail('请输入用户名和密码'));
  }

  const user = await db.get(
    'SELECT id, username, password_hash, name, dept, role_code, role, phone, email, status FROM users WHERE username = ?',
    [username]
  );

  if (!user) {
    auditLog('LOGIN_FAIL', null, username, { reason: 'user_not_found' });
    return res.json(fail('用户名或密码错误'));
  }

  if (user.status === '禁用') {
    auditLog('LOGIN_FAIL', user.id, username, { reason: 'disabled' });
    return res.json(fail('账号已被禁用，请联系管理员'));
  }

  // 校验密码：兼容老系统明文 + 新系统 bcrypt
  let ok = false;
  if (user.password_hash && user.password_hash.startsWith('$2')) {
    ok = bcrypt.compareSync(password, user.password_hash);
  } else {
    ok = user.password_hash === password;
    if (ok) {
      // 自动升级为 bcrypt
      const newHash = bcrypt.hashSync(password, 10);
      await db.run(
        "UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?",
        [newHash, user.id]
      );
      user.password_hash = newHash;
      logger.info(`✓ [auto-upgrade] 用户 ${username} 密码已升级为 bcrypt`);
    }
  }

  if (!ok) {
    auditLog('LOGIN_FAIL', user.id, username, { reason: 'bad_password' });
    return res.json(fail('用户名或密码错误'));
  }

  // 更新 last_login_at
  await db.run(
    "UPDATE users SET last_login_at = datetime('now','localtime') WHERE id = ?",
    [user.id]
  );

  // 签发 token
  const token = signToken(user.id, user.role || user.role_code, {
    username: user.username,
    role_code: user.role_code,
  });

  auditLog('LOGIN_OK', user.id, user.username);

  // 移除敏感字段
  delete user.password_hash;

  return res.json(success({
    ...user,
    token,
  }, '登录成功'));
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  const user = await db.get(
    'SELECT id, username, name, dept, role_code, role, phone, email, status, last_login_at FROM users WHERE id = ?',
    [req.userId]
  );

  if (!user) return res.json(fail('用户不存在'));
  return res.json(success(user));
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  auditLog('LOGOUT', req.userId, req.user.username);
  return res.json(success(null, '已退出登录'));
}

/**
 * POST /api/auth/change-password
 * body: { oldPassword, newPassword }
 */
async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.json(fail('请输入原密码和新密码'));
  }
  if (newPassword.length < 8) {
    return res.json(fail('新密码至少 8 位'));
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.json(fail('新密码必须包含字母和数字'));
  }

  const user = await db.get('SELECT id, password_hash FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.json(fail('用户不存在'));

  // 校验旧密码
  let ok = false;
  if (user.password_hash.startsWith('$2')) {
    ok = bcrypt.compareSync(oldPassword, user.password_hash);
  } else {
    ok = user.password_hash === oldPassword;
  }
  if (!ok) return res.json(fail('原密码错误'));

  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.run(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [newHash, req.userId]
  );

  auditLog('CHANGE_PASSWORD', req.userId, req.user.username);
  return res.json(success(null, '密码修改成功'));
}

module.exports = { login, me, logout, changePassword };
