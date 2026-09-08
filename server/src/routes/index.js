const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() }, message: '健康检查通过' });
});

router.use('/auth', require('./auth.routes'));
router.use('/user', require('./user.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/reports', require('./report.routes'));
router.use('/notifications', require('./notification.routes'));

// P4 高级特性（必须先于动态 CRUD 注册）
router.use('/', require('./p4.routes'));

// 动态模块 CRUD + 工作流（业务表，挂在 /api/{table}）
router.use('/', require('./crud.routes'));

module.exports = router;