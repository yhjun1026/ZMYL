const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() }, message: '健康检查通过' });
});

router.use('/auth', require('./auth.routes'));
router.use('/user', require('./user.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;