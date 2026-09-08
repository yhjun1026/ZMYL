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
const { MODULES, WORKFLOW } = require('../config/modules');

router.use(auth);

// ---- 通用 CRUD ----
for (const table of Object.keys(MODULES)) {
  router.get(`/${table}`, asyncHandler(crud.list));
  router.get(`/${table}/:id(\\d+)`, asyncHandler(crud.getOne));
  router.post(`/${table}`, asyncHandler(crud.create));
  router.put(`/${table}/:id(\\d+)`, asyncHandler(crud.update));
  router.delete(`/${table}/:id(\\d+)`, asyncHandler(crud.remove));
}

// ---- 两级审批（8 张档案表 + 证照变更申请）----
for (const table of [...WORKFLOW.TWO_LEVEL, 'cert_update_request']) {
  router.put(`/${table}/:id(\\d+)/review`, asyncHandler(wf.review));
  router.put(`/${table}/:id(\\d+)/approve`, asyncHandler(wf.approve));
}

// ---- 采购计划：单级审批 + 转采购执行单 ----
router.post('/purchase_plan/:id(\\d+)/review', asyncHandler(wf.reviewPlan));
router.post('/purchase_plan/:id(\\d+)/convert-to-procurement', asyncHandler(wf.convertPlan));

// ---- 采购入库五步流 ----
const PROC_ACTIONS = wf.PROC_STEPS.map((s) => s.action).join('|');
for (const table of WORKFLOW.PROC) {
  router.post(`/${table}/:id(\\d+)/:step(${PROC_ACTIONS})`, asyncHandler(wf.procFlow));
}

module.exports = router;
