const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');
const db = require('../db');

/**
 * JWT 鉴权中间件
 * - 注入 req.userId / req.userRole / req.user
 * - 用户被禁用(status='禁用')直接拒绝
 * 注意：必须挂在 asyncHandler 之外或自行 try/catch（Express 4 不捕获 async 异常）
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    // 支持 Authorization: Bearer <token> 与 ?token=<token>（浏览器直接打开 PDF/下载链接无法带 header）
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.query && req.query.token) || '';
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json(fail('未登录或登录已过期', 401));
    }

    // 查完整用户对象
    const user = await db.get(
      'SELECT id, username, name, dept, role_code, role, phone, email, status FROM users WHERE id = ?',
      [decoded.userId]
    );

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
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
