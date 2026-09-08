const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(auth);
router.get('/', asyncHandler(ctrl.stats));
router.get('/trends', asyncHandler(ctrl.trends));

module.exports = router;