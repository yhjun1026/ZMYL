const { fail } = require('../utils/response');

/**
 * RBAC 占位中间件（P3 完善）
 * 当前只做"是否登录"的判断，权限矩阵后续接 approval_flow / 用户角色
 */
function requireAction(action) {
  return (req, res, next) => {
    // P1 阶段先放行所有登录用户；P3 接 approval_flow + 角色矩阵
    if (!req.user) {
      return res.status(401).json(fail('未登录', 401));
    }
    next();
  };
}

module.exports = { requireAction };