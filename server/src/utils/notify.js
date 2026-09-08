/**
 * 审批通知推送 —— 对齐数据包 _push_notification
 * 写入 approval_notification 表（fire-and-forget，失败不阻断主流程）
 */
const db = require('../db');
const logger = require('./logger');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

/**
 * pushNotification({
 *   title, content, module, refNo, refId, actionType,
 *   targetRole,   // 目标角色代码（空 = 广播）
 *   targetUser,   // 目标用户名（空 = 按角色广播）
 *   sourceUser,   // 来源用户
 * })
 */
async function pushNotification({
  title, content, module: mod = '', refNo = '', refId = 0,
  actionType = '', targetRole = '', targetUser = '', sourceUser = '',
}) {
  try {
    await db.run(
      `INSERT INTO approval_notification
        (title, content, module, ref_no, ref_id, action_type,
         target_role, target_user, source_user, is_read, created_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0)`,
      [title, content || '', mod, refNo, refId || 0, actionType,
        targetRole || '', targetUser || '', sourceUser || '', nowStr()]
    );
  } catch (err) {
    logger.warn(`[notify] 通知写入失败: ${err.message}`);
  }
}

module.exports = { pushNotification };
