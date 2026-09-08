const db = require('../db');
const logger = require('./logger');

/**
 * 写入审计日志（同时写到 audit_log 表 + logger）
 */
function auditLog(action, userId, target = null, detail = null) {
  try {
    db.prepare(
      `INSERT INTO audit_log (action, user_id, target, detail, created_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`
    ).run(action, userId || null, target, detail ? JSON.stringify(detail) : null);
  } catch (err) {
    logger.warn(`auditLog 失败: ${err.message}`);
  }
}

module.exports = auditLog;