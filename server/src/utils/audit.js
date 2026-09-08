const db = require('../db');
const logger = require('./logger');

/**
 * 写入审计日志（同时写到 audit_log 表 + logger）
 * fire-and-forget：调用方无需 await，失败只记 warn 不影响主流程
 */
function auditLog(action, userId, target = null, detail = null) {
  db.run(
    `INSERT INTO audit_log (action, user_id, target, detail, created_at)
     VALUES (?, ?, ?, ?, datetime('now','localtime'))`,
    [action, userId || null, target, detail ? JSON.stringify(detail) : null]
  ).catch((err) => {
    logger.warn(`auditLog 失败: ${err.message}`);
  });
}

module.exports = auditLog;
