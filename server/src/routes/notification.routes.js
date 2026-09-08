/**
 * 审批通知收件箱路由
 *   GET  /api/notifications               最近 50 条
 *   GET  /api/notifications/unread-count  未读数
 *   PUT  /api/notifications/:id/read      标记已读
 *   PUT  /api/notifications/read-all      全部已读
 */
const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const notification = require('../controllers/notification.controller');

router.use(auth);

router.get('/', asyncHandler(notification.list));
router.get('/unread-count', asyncHandler(notification.unreadCount));
router.put('/read-all', asyncHandler(notification.markAllRead));
router.put('/:id(\\d+)/read', asyncHandler(notification.markRead));

module.exports = router;
