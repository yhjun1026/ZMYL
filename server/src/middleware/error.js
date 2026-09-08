const logger = require('../utils/logger');
const { fail } = require('../utils/response');

/**
 * 全局错误处理
 */
function errorHandler(err, req, res, next) {
  // body parse 错误
  if (err.type === 'entity.too.large') {
    return res.status(413).json(fail('请求体过大', 413));
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(fail('请求体不是合法 JSON', 400));
  }

  // Joi 校验错误
  if (err.isJoi) {
    return res.status(400).json(fail(err.details[0]?.message || '参数校验失败', 400));
  }

  logger.error(`[${req.method} ${req.originalUrl}] ${err.stack || err.message}`);

  res.status(err.status || 500).json(fail(
    process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    err.status || 500
  ));
}

function notFound(req, res) {
  res.status(404).json(fail(`路径不存在: ${req.method} ${req.originalUrl}`, 404));
}

module.exports = { errorHandler, notFound };