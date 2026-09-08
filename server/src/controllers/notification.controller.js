/**
 * 审批通知收件箱 —— 对齐数据包 notifications 端点
 * 推送规则：target_user = 用户名（定向） 或 target_role = 角色且 target_user 空（按角色）
 *          或 target_role 空（广播）
 */
const db = require('../db');
const { success, fail } = require('../utils/response');

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
}

/** 当前用户可见通知的 WHERE 片段（? 参数: username, roleCode） */
const VIS = `(target_user = ? OR (target_role = ? AND target_user = '') OR target_role = '')`;

/**
 * GET /api/notifications   最近 50 条
 */
async function list(req, res) {
  const username = req.user.username;
  const role = req.userRoleCode;
  const items = await db.all(
    `SELECT id, title, content, module, ref_no, ref_id, action_type,
            target_role, target_user, source_user, is_read, read_at, created_at
       FROM approval_notification
      WHERE deleted = 0 AND ${VIS}
      ORDER BY id DESC LIMIT 50`,
    [username, role]
  );
  return res.json(success(items));
}

/**
 * GET /api/notifications/unread-count   -> { count }
 */
async function unreadCount(req, res) {
  const r = await db.get(
    `SELECT COUNT(*) AS c FROM approval_notification
      WHERE deleted = 0 AND is_read = 0 AND ${VIS}`,
    [req.user.username, req.userRoleCode]
  );
  return res.json(success({ count: r ? r.c : 0 }));
}

/**
 * PUT /api/notifications/:id/read
 */
async function markRead(req, res) {
  const { id } = req.params;
  const n = await db.get('SELECT * FROM approval_notification WHERE id = ? AND deleted = 0', [id]);
  if (!n) return res.status(404).json(fail('通知不存在', 404));
  // 只能标记自己可见的通知
  const visible = n.target_user === req.user.username
    || (n.target_role === req.userRoleCode && !n.target_user)
    || !n.target_role;
  if (!visible) return res.status(403).json(fail('无权操作该通知', 403));

  await db.run('UPDATE approval_notification SET is_read = 1, read_at = ? WHERE id = ?', [nowStr(), id]);
  return res.json(success(null, '已标记为已读'));
}

/**
 * PUT /api/notifications/read-all
 */
async function markAllRead(req, res) {
  const info = await db.run(
    `UPDATE approval_notification SET is_read = 1, read_at = ?
      WHERE deleted = 0 AND is_read = 0 AND ${VIS}`,
    [nowStr(), req.user.username, req.userRoleCode]
  );
  return res.json(success({ updated: info.changes }, `已全部标记为已读（${info.changes} 条）`));
}

module.exports = { list, unreadCount, markRead, markAllRead };
