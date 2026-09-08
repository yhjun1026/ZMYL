/**
 * P4 高级特性路由
 *
 * /api/approval-flows/*  可配置审批流管理（生命周期 + 钩子视图）
 * /api/cold-chain/*      冷链管理（设备/记录/IoT/报警/台账/看板）
 * /api/logistics/*       物流进度追踪（承运商/物流单/轨迹节点）
 * /api/bridge/*          数据互联互通（选项/待办聚合/流转汇总）
 * /api/backup/*          数据备份（手动/自动/下载/删除）
 *
 * 注意：本路由必须在动态 CRUD（/:table）之前注册，避免被泛路由吞掉。
 * IoT 上报接口走 api_key 认证（免 JWT），在 app.js 白名单中放行。
 */
const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const flow = require('../controllers/flow.controller');
const cc = require('../controllers/coldchain.controller');
const logi = require('../controllers/logistics.controller');
const bridge = require('../controllers/bridge.controller');
const backup = require('../controllers/backup.controller');

// ---- 可配置审批流 ----
router.get('/approval-flows/meta', asyncHandler(flow.meta));
router.get('/approval-flows/pending', asyncHandler(flow.pending));
router.get('/approval-flows/active', asyncHandler(flow.active));
router.get('/approval-flows/hooks', asyncHandler(flow.hooks));
router.get('/approval-flows', asyncHandler(flow.list));
router.get('/approval-flows/:id(\\d+)', asyncHandler(flow.getOne));
router.post('/approval-flows', asyncHandler(flow.create));
router.put('/approval-flows/:id(\\d+)', asyncHandler(flow.update));
router.delete('/approval-flows/:id(\\d+)', asyncHandler(flow.remove));
router.post('/approval-flows/:id(\\d+)/submit', asyncHandler(flow.submit));
router.post('/approval-flows/:id(\\d+)/approve', asyncHandler(flow.approve));
router.post('/approval-flows/:id(\\d+)/disable', asyncHandler(flow.disable));
router.post('/approval-flows/:id(\\d+)/new-version', asyncHandler(flow.newVersion));
router.get('/approval-flows/:id(\\d+)/versions', asyncHandler(flow.versions));
router.get('/approval-flows/:id(\\d+)/logs', asyncHandler(flow.logs));

// ---- 冷链管理 ----
router.get('/cold-chain/dashboard', asyncHandler(cc.dashboard));
router.get('/cold-chain/chain-trace', asyncHandler(cc.chainTrace));
router.get('/cold-chain/devices', asyncHandler(cc.listDevices));
router.post('/cold-chain/devices', asyncHandler(cc.createDevice));
router.put('/cold-chain/devices/:id(\\d+)', asyncHandler(cc.updateDevice));
router.delete('/cold-chain/devices/:id(\\d+)', asyncHandler(cc.removeDevice));
router.get('/cold-chain/records', asyncHandler(cc.listRecords));
router.post('/cold-chain/records', asyncHandler(cc.createRecord));
router.post('/cold-chain/records/batch', asyncHandler(cc.batchRecords));
// IoT 上报（api_key 认证，app.js 白名单免 JWT）
router.post('/cold-chain/iot/report', asyncHandler(cc.iotReport));
router.post('/cold-chain/iot/batch-report', asyncHandler(cc.iotBatchReport));
router.get('/cold-chain/alarms', asyncHandler(cc.listAlarms));
router.get('/cold-chain/alarms/stats', asyncHandler(cc.alarmStats));
router.post('/cold-chain/alarms/scan-offline', asyncHandler(cc.scanOffline));
router.post('/cold-chain/alarms/:id(\\d+)/handle', asyncHandler(cc.handleAlarm));
router.get('/cold-chain/ledgers', asyncHandler(cc.listLedgers));
router.get('/cold-chain/ledgers/:id(\\d+)', asyncHandler(cc.getLedger));
router.post('/cold-chain/ledgers/generate', asyncHandler(cc.generateLedger));
router.post('/cold-chain/ledgers/:id(\\d+)/verify', asyncHandler(cc.verifyLedger));

// ---- 物流进度追踪 ----
router.get('/logistics/dashboard', asyncHandler(logi.dashboard));
router.get('/logistics/trace', asyncHandler(logi.trace));
router.get('/logistics/carriers', asyncHandler(logi.listCarriers));
router.post('/logistics/carriers', asyncHandler(logi.createCarrier));
router.put('/logistics/carriers/:id(\\d+)', asyncHandler(logi.updateCarrier));
router.delete('/logistics/carriers/:id(\\d+)', asyncHandler(logi.removeCarrier));
router.get('/logistics/orders', asyncHandler(logi.listOrders));
router.post('/logistics/orders', asyncHandler(logi.createOrder));
router.get('/logistics/orders/:id(\\d+)', asyncHandler(logi.getOrder));
router.put('/logistics/orders/:id(\\d+)', asyncHandler(logi.updateOrder));
router.delete('/logistics/orders/:id(\\d+)', asyncHandler(logi.removeOrder));
router.post('/logistics/orders/:id(\\d+)/nodes', asyncHandler(logi.addNode));
router.delete('/logistics/orders/:id(\\d+)/nodes/:nid(\\d+)', asyncHandler(logi.removeNode));
router.post('/logistics/orders/:id(\\d+)/exception', asyncHandler(logi.markException));

// ---- 数据互联互通 ----
router.get('/bridge/inventory-options', asyncHandler(bridge.inventoryOptions));
router.get('/bridge/supplier-options', asyncHandler(bridge.supplierOptions));
router.get('/bridge/customer-options', asyncHandler(bridge.customerOptions));
router.get('/bridge/product-options', asyncHandler(bridge.productOptions));
router.get('/bridge/factory-options', asyncHandler(bridge.factoryOptions));
router.get('/bridge/pending-approvals', asyncHandler(bridge.pendingApprovals));
router.get('/bridge/data-flow-summary', asyncHandler(bridge.dataFlowSummary));

// ---- 数据备份 ----
router.get('/backup', asyncHandler(backup.list));
router.post('/backup/run', asyncHandler(backup.run));
router.get('/backup/:id(\\d+)/download', asyncHandler(backup.download));
router.delete('/backup/:id(\\d+)', asyncHandler(backup.remove));

module.exports = router;
