/**
 * 模块注册表：表名 -> { title, searchFields, orderBy? }
 * 驱动自动 CRUD 路由生成 + 前端菜单搜索字段
 * 对齐老后端 routers/modules.py（39 个）+ 补注册 cure_record（老系统有表未注册）
 */
const MODULES = {
  equip_ledger:        { title: '设备台账',     searchFields: ['name', 'udi', 'model', 'factory'] },
  inventory:           { title: '库存管理',     searchFields: ['name', 'udi', 'batch', 'location'] },
  inventory_log:       { title: '库存流水',     searchFields: ['name', 'udi', 'ref_no'] },
  outbound_record:     { title: '销售出库',     searchFields: ['order_no', 'customer', 'equip_name'] },
  expiry_warning:      { title: '效期预警',     searchFields: ['name', 'batch'] },
  purchase_plan:       { title: '采购计划',     searchFields: ['plan_no', 'name', 'applicant'] },
  proc_equipment:      { title: '设备采购单',   searchFields: ['order_no', 'equip_name', 'supplier'] },
  proc_consumable:     { title: '耗材采购单',   searchFields: ['order_no', 'equip_name', 'supplier'] },
  product_acceptance:  { title: '产品验收',     searchFields: ['product_name', 'batch_no', 'supplier'] },
  acceptance_record:   { title: '验收记录',     searchFields: ['equip_name', 'person'] },
  equip_inspection:    { title: '设备巡检',     searchFields: ['equip_name', 'inspector'] },
  equip_acceptance:    { title: '设备验收',     searchFields: ['equip_name', 'person'] },
  supplier:            { title: '供应商档案',   searchFields: ['name', 'code', 'contact'] },
  supplier_doc:        { title: '供应商资质文档', searchFields: ['title', 'doc_type'] },
  customer_archive:    { title: '客户档案',     searchFields: ['name', 'credit_code'] },
  first_factory_audit: { title: '首营企业审核', searchFields: ['name', 'applicant'] },
  first_product_audit: { title: '首营产品审核', searchFields: ['name', 'spec', 'factory'] },
  cert_update_request: { title: '证照变更申请', searchFields: ['record_name', 'module'] },
  national_standard:   { title: '国家标准库',   searchFields: ['std_no', 'name'] },
  standard_check:      { title: '标准符合性检查', searchFields: ['equip_name', 'std_no'] },
  repair_order:        { title: '维修工单',     searchFields: ['equip_name', 'reporter', 'repairer'] },
  maintenance_plan:    { title: '保养计划',     searchFields: ['equip_name', 'type'] },
  calibration_plan:    { title: '计量计划',     searchFields: ['equip_name', 'cal_no'] },
  calibration_record:  { title: '计量记录',     searchFields: ['equip_name', 'cal_no', 'org'] },
  adverse_event:       { title: '不良事件',     searchFields: ['equip_name', 'desc', 'reporter'] },
  recall_record:       { title: '召回追溯',     searchFields: ['notify_no', 'product', 'udi'] },
  cure_record:         { title: '养护记录',     searchFields: ['equip_name', 'person'] }, // 老系统有表未注册，此处补上
  temp_humidity_log:   { title: '温湿度记录',   searchFields: ['hour', 'record_date'] },
  health_checkup_plan: { title: '体检计划',     searchFields: ['name', 'dept'] },
  health_record:       { title: '健康档案',     searchFields: ['name', 'dept'] },
  personnel:           { title: '人员档案',     searchFields: ['name', 'dept', 'position'] },
  training_plan:       { title: '培训计划',     searchFields: ['plan_no', 'title'] },
  training_record:     { title: '培训记录',     searchFields: ['record_no', 'title', 'trainer'] },
  knowledge_base:      { title: '知识库/SOP',   searchFields: ['title', 'code', 'tags'] },
  finance_record:      { title: '财务记录',     searchFields: ['ref_no', 'dept', 'note'] },
  operation_log:       { title: '操作日志',     searchFields: ['user', 'text'] },
  data_bridge_log:     { title: '数据桥接日志', searchFields: ['bridge_type', 'source_module'] },
  approval_notification: { title: '审批通知',   searchFields: ['title', 'module', 'target_user'] },
  acceptance_doc:        { title: '验收资料',   searchFields: ['title', 'file_name', 'order_no'] }, // P3：PDF 留档
  outbound_template:   { title: '出库模板',     searchFields: ['name', 'description'] },
  system_profile:      { title: '系统配置',     searchFields: ['name'] },
  // ---- P4 高级特性 ----
  approval_flow:       { title: '审批流程配置', searchFields: ['flow_code', 'flow_name', 'biz_module'] },
  approval_flow_log:   { title: '审批流程日志', searchFields: ['flow_code', 'flow_name', 'action'] },
  cold_chain_device:   { title: '冷链设备',     searchFields: ['device_code', 'device_name', 'location'] },
  cold_chain_record:   { title: '冷链监测记录', searchFields: ['device_name', 'batch', 'product_name'] },
  cold_chain_alarm:    { title: '冷链报警',     searchFields: ['alarm_no', 'device_name', 'product_name'] },
  cold_chain_ledger:   { title: '冷链台账',     searchFields: ['ledger_no', 'product_name', 'batch'] },
  logistics_carrier:   { title: '承运商档案',   searchFields: ['name', 'carrier_code', 'license_no'] },
  logistics_order:     { title: '物流单',       searchFields: ['logistics_no', 'product_name', 'carrier_name'] },
  logistics_node:      { title: '物流轨迹',     searchFields: ['node_name', 'location'] },
  backup_record:       { title: '备份记录',     searchFields: ['file_name', 'type'] },
};

// 工作流模式（与前端 ModulePage.vue WF_* 常量对齐）
const WORKFLOW = {
  // 两级审批：待审核 -> 已审核 -> 已批准/已驳回
  TWO_LEVEL: [
    'supplier', 'customer_archive', 'personnel', 'health_record',
    'training_plan', 'first_factory_audit', 'first_product_audit', 'system_profile',
  ],
  // 采购计划单级审批：待审批 -> 已批准/已驳回（+ 已转采购）
  PLAN: ['purchase_plan'],
  // 采购入库五步流：待验收 -> 待质管审核 -> 待库管确认 -> 待负责人批准 -> 已入库
  PROC: ['proc_equipment', 'proc_consumable'],
  // P3 销售出库六级流：待销售经理审核 -> 待质管员 -> 待库管员 -> 待质量负责人 -> 待销售总监 -> 已出库
  OUTBOUND: ['outbound_record'],
  // P3 产品验收五步流：待验收 -> 外观检查完成 -> 数量核对完成 -> 质量检验完成 -> 已完成
  PA: ['product_acceptance'],
};

module.exports = { MODULES, WORKFLOW };
