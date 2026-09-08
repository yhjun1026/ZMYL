const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');
const db = require('../db');

/**
 * JWT 鉴权中间件
 * - 注入 req.userId / req.userRole / req.user
 * - 用户被禁用(status='禁用')直接拒绝
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json(fail('未登录或登录已过期', 401));
  }

  // 查完整用户对象
  const user = db
    .prepare('SELECT id, username, name, dept, role_code, role, phone, email, status FROM users WHERE id = ?')
    .get(decoded.userId);

  if (!user) {
    return res.status(401).json(fail('用户不存在', 401));
  }
  if (user.status === '禁用') {
    return res.status(401).json(fail('账号已被禁用', 401));
  }

  req.userId = user.id;
  req.userRole = user.role;
  req.userRoleCode = user.role_code;
  req.user = user;
  next();
}

module.exports = authMiddleware;