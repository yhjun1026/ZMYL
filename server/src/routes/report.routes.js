/**
 * 报表中心路由
 *   GET /api/reports                 报表类型清单
 *   GET /api/reports/summary         采购-库存-销售-财务 汇总
 *   GET /api/reports/export/:type    Excel 导出（7 类）
 */
const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const report = require('../controllers/report.controller');

router.use(auth);

router.get('/', asyncHandler(report.listReports));
router.get('/summary', asyncHandler(report.summary));
router.get('/export/:type', asyncHandler(report.exportReport));

module.exports = router;
