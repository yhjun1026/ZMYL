/**
 * 动态 CRUD + 工作流路由
 * 按模块注册表为每张表挂载:
 *   GET    /api/{table}          分页列表
 *   GET    /api/{table}/:id      详情
 *   POST   /api/{table}          新增
 *   PUT    /api/{table}/:id      更新
 *   DELETE /api/{table}/:id      删除（逻辑删除 + GSP 保护）
 * 工作流路由:
 *   PUT  /api/{two_level_table}/:id/review|approve
 *   PUT  /api/cert_update_request/:id/review|approve
 *   POST /api/purchase_plan/:id/review | /convert-to-procurement
 *   POST /api/{proc_table}/:id/{step}
 */
const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const crud = require('../controllers/crud.controller');
const wf = require('../controllers/workflow.controller');
const outbound = require('../controllers/outbound.controller');
const pa = require('../controllers/acceptance.controller');
const fileCtl = require('../controllers/file.controller');
const { MODULES, WORKFLOW } = require('../config/modules');

router.use(auth);

// ---- P3 专用路由（先于通用 CRUD 注册，避免被泛路由吞掉） ----

// 销售出库六级审批 + 打印留痕
router.post('/outbound_record/:id(\\d+)/flow', asyncHandler(outbound.outboundFlow));
router.post('/outbound_record/:id(\\d+)/print', asyncHandler(outbound.printStamp));

// 产品验收五步流 + 重置 + 效期统计
router.post('/product_acceptance/:id(\\d+)/workflow-step', asyncHandler(pa.paStep));
router.post('/product_acceptance/:id(\\d+)/workflow-reset', asyncHandler(pa.paReset));
router.get('/product_acceptance/expiry-stats', asyncHandler(pa.paExpiryStats));

// 验收资料 PDF 上传/下载（multer multipart）
router.post('/acceptance_doc', fileCtl.upload.single('file'), asyncHandler(fileCtl.uploadDoc));
router.get('/acceptance_doc', asyncHandler(fileCtl.listDocs)); // 按 biz_type/biz_id 过滤（先于通用 CRUD）
router.get('/acceptance_doc/:id(\\d+)/file', asyncHandler(fileCtl.downloadDoc));
router.delete('/acceptance_doc/:id(\\d+)', asyncHandler(fileCtl.removeDoc));

// ---- 通用 CRUD（参数化路由，controller 从 req.params.table 取表名） ----
router.get('/:table', asyncHandler(crud.list));
router.get('/:table/:id(\\d+)', asyncHandler(crud.getOne));
router.post('/:table', asyncHandler(crud.create));
router.put('/:table/:id(\\d+)', asyncHandler(crud.update));
router.delete('/:table/:id(\\d+)', asyncHandler(crud.remove));

// ---- 两级审批（参数化路由；controller 内部校验表是否支持审批流） ----
router.put('/:table/:id(\\d+)/review', asyncHandler(wf.review));
router.put('/:table/:id(\\d+)/approve', asyncHandler(wf.approve));

// ---- 采购计划：单级审批 + 转采购执行单 ----
router.post('/purchase_plan/:id(\\d+)/review', asyncHandler(wf.reviewPlan));
router.post('/purchase_plan/:id(\\d+)/convert-to-procurement', asyncHandler(wf.convertPlan));

// ---- 采购入库五步流（controller 内部校验 WORKFLOW.PROC） ----
const PROC_ACTIONS = wf.PROC_STEPS.map((s) => s.action).join('|');
router.post(`/:table/:id(\\d+)/:step(${PROC_ACTIONS})`, asyncHandler(wf.procFlow));

module.exports = router;
