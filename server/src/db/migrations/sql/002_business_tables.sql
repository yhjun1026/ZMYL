-- 自动生成: 002 业务表 DDL（由 V1__init_schema.sql MySQL -> SQLite 转换）
-- 生成时间: 2026-09-08  生成工具: scripts/mysql2sqlite.py（一次性）
CREATE TABLE IF NOT EXISTS "acceptance_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "supplier" TEXT DEFAULT NULL,
  "person" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "issue" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "adverse_event" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "desc" TEXT DEFAULT NULL,
  "severity" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "reporter" TEXT DEFAULT NULL,
  "report_date" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "approval_notification" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "title" TEXT DEFAULT NULL,
  "content" TEXT DEFAULT NULL,
  "module" TEXT DEFAULT NULL,
  "ref_no" TEXT DEFAULT NULL,
  "ref_id" INTEGER DEFAULT NULL,
  "action_type" TEXT DEFAULT NULL,
  "target_role" TEXT DEFAULT NULL,
  "target_user" TEXT DEFAULT NULL,
  "source_user" TEXT DEFAULT NULL,
  "is_read" INTEGER DEFAULT NULL,
  "read_at" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "calibration_plan" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "cal_no" TEXT DEFAULT NULL,
  "last_cal" TEXT DEFAULT NULL,
  "next_cal" TEXT DEFAULT NULL,
  "org" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "calibration_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "cal_date" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "cert" TEXT DEFAULT NULL,
  "org" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "cert_update_request" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "module" TEXT DEFAULT NULL,
  "record_id" INTEGER DEFAULT NULL,
  "record_name" TEXT DEFAULT NULL,
  "field_changes" TEXT DEFAULT NULL,
  "new_data" TEXT DEFAULT NULL,
  "update_reason" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "submitted_by" TEXT DEFAULT NULL,
  "submitted_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "applied_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "cure_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "person" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "temp" TEXT DEFAULT NULL,
  "humid" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "next_date" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "customer_archive" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "code" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "license" TEXT DEFAULT NULL,
  "license_expire" TEXT DEFAULT NULL,
  "contact" TEXT DEFAULT NULL,
  "phone" TEXT DEFAULT NULL,
  "address" TEXT DEFAULT NULL,
  "credit_level" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "audit_status" TEXT DEFAULT NULL,
  "auditor" TEXT DEFAULT NULL,
  "audit_date" TEXT DEFAULT NULL,
  "audit_opinion" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "cert_update_status" TEXT DEFAULT NULL,
  "cert_update_id" INTEGER DEFAULT NULL,
  "cert_update_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "data_bridge_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "bridge_type" TEXT DEFAULT NULL,
  "source_module" TEXT DEFAULT NULL,
  "source_ref" TEXT DEFAULT NULL,
  "target_module" TEXT DEFAULT NULL,
  "target_ref" TEXT DEFAULT NULL,
  "description" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "equip_acceptance" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_udi" TEXT DEFAULT NULL,
  "equip_name" TEXT DEFAULT NULL,
  "supplier" TEXT DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "dept_name" TEXT DEFAULT NULL,
  "serial_no" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "use_years" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "person" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "step" TEXT DEFAULT NULL,
  "check_items" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "equip_inspection" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "dept_name" TEXT DEFAULT NULL,
  "serial_no" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "inspector" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "status_desc" TEXT DEFAULT NULL,
  "note" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "equip_ledger" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "udi" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "model" TEXT DEFAULT NULL,
  "cls" TEXT DEFAULT NULL,
  "risk" TEXT DEFAULT NULL,
  "cert" TEXT DEFAULT NULL,
  "factory" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "production_date" TEXT DEFAULT NULL,
  "serial_no" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "service_life" TEXT DEFAULT NULL,
  "sale_price" REAL DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "expiry_warning" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "udi" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "batch" TEXT DEFAULT NULL,
  "prod_date" TEXT DEFAULT NULL,
  "expire_date" TEXT DEFAULT NULL,
  "remain_days" INTEGER DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "manufacturer" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "finance_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "category" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "amount" REAL DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "ref_no" TEXT DEFAULT NULL,
  "dept" TEXT DEFAULT NULL,
  "operator" TEXT DEFAULT NULL,
  "note" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "first_factory_audit" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "code" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "license" TEXT DEFAULT NULL,
  "license_expire" TEXT DEFAULT NULL,
  "gmp_cert" TEXT DEFAULT NULL,
  "gmp_expire" TEXT DEFAULT NULL,
  "iso_cert" TEXT DEFAULT NULL,
  "iso_expire" TEXT DEFAULT NULL,
  "business_license" TEXT DEFAULT NULL,
  "scope" TEXT DEFAULT NULL,
  "address" TEXT DEFAULT NULL,
  "legal_person" TEXT DEFAULT NULL,
  "contact" TEXT DEFAULT NULL,
  "phone" TEXT DEFAULT NULL,
  "applicant" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "first_reviewer" TEXT DEFAULT NULL,
  "first_review_date" TEXT DEFAULT NULL,
  "first_review_opinion" TEXT DEFAULT NULL,
  "second_reviewer" TEXT DEFAULT NULL,
  "second_review_date" TEXT DEFAULT NULL,
  "second_review_opinion" TEXT DEFAULT NULL,
  "audit_opinion" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "cert_update_status" TEXT DEFAULT NULL,
  "cert_update_id" INTEGER DEFAULT NULL,
  "cert_update_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "first_product_audit" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "spec" TEXT DEFAULT NULL,
  "factory" TEXT DEFAULT NULL,
  "cls" TEXT DEFAULT NULL,
  "reg_cert" TEXT DEFAULT NULL,
  "reg_cert_expire" TEXT DEFAULT NULL,
  "license" TEXT DEFAULT NULL,
  "license_expire" TEXT DEFAULT NULL,
  "func_desc" TEXT DEFAULT NULL,
  "comp_desc" TEXT DEFAULT NULL,
  "applicant" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "first_reviewer" TEXT DEFAULT NULL,
  "first_review_date" TEXT DEFAULT NULL,
  "first_review_opinion" TEXT DEFAULT NULL,
  "second_reviewer" TEXT DEFAULT NULL,
  "second_review_date" TEXT DEFAULT NULL,
  "second_review_opinion" TEXT DEFAULT NULL,
  "audit_opinion" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "cert_update_status" TEXT DEFAULT NULL,
  "cert_update_id" INTEGER DEFAULT NULL,
  "cert_update_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "health_checkup_plan" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "dept" TEXT DEFAULT NULL,
  "plan_year" TEXT DEFAULT NULL,
  "plan_date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "checkup_items" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "health_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "dept" TEXT DEFAULT NULL,
  "position" TEXT DEFAULT NULL,
  "health_cert_no" TEXT DEFAULT NULL,
  "health_cert_org" TEXT DEFAULT NULL,
  "health_cert_expire" TEXT DEFAULT NULL,
  "checkup_date" TEXT DEFAULT NULL,
  "checkup_result" TEXT DEFAULT NULL,
  "work_restriction" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "udi" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "spec" TEXT DEFAULT NULL,
  "batch" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "unit" TEXT DEFAULT NULL,
  "min_stock" INTEGER DEFAULT NULL,
  "location" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "ref_no" TEXT DEFAULT NULL,
  "manufacturer" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "inventory_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "udi" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "change_qty" INTEGER DEFAULT NULL,
  "before_qty" INTEGER DEFAULT NULL,
  "after_qty" INTEGER DEFAULT NULL,
  "ref_no" TEXT DEFAULT NULL,
  "operator" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "note" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "knowledge_base" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "category" TEXT DEFAULT NULL,
  "code" TEXT DEFAULT NULL,
  "title" TEXT DEFAULT NULL,
  "gsp_ref" TEXT DEFAULT NULL,
  "summary" TEXT DEFAULT NULL,
  "content" TEXT DEFAULT NULL,
  "steps" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "tags" TEXT DEFAULT NULL,
  "view_count" INTEGER DEFAULT NULL,
  "sort_order" INTEGER DEFAULT NULL,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "updated_at" TEXT DEFAULT NULL,
  "subcategory" TEXT DEFAULT NULL,
  "updated_by" TEXT DEFAULT '',
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "maintenance_plan" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "plan_date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "person" TEXT DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "dept_name" TEXT DEFAULT NULL,
  "serial_no" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "national_standard" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "std_no" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "issue_date" TEXT DEFAULT NULL,
  "scope" TEXT DEFAULT NULL,
  "impl_date" TEXT DEFAULT NULL,
  "replace_std" TEXT DEFAULT NULL,
  "summary" TEXT DEFAULT NULL,
  "compliance_req" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "operation_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "time" TEXT DEFAULT NULL,
  "text" TEXT DEFAULT NULL,
  "user" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "outbound_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "order_no" TEXT DEFAULT NULL,
  "customer" TEXT DEFAULT NULL,
  "customer_license" TEXT DEFAULT NULL,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "batch" TEXT DEFAULT NULL,
  "reg_cert" TEXT DEFAULT NULL,
  "factory_name" TEXT DEFAULT NULL,
  "prod_license_no" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "unit" TEXT DEFAULT NULL,
  "price" REAL DEFAULT NULL,
  "total" REAL DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "prod_date" TEXT DEFAULT NULL,
  "expire_date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "operator" TEXT DEFAULT NULL,
  "reviewer" TEXT DEFAULT NULL,
  "quality_approver" TEXT DEFAULT NULL,
  "recipient" TEXT DEFAULT NULL,
  "transport_condition" TEXT DEFAULT NULL,
  "storage_condition" TEXT DEFAULT NULL,
  "note" TEXT DEFAULT NULL,
  "audit_trail" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "outbound_template" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "description" TEXT DEFAULT NULL,
  "config" TEXT DEFAULT NULL,
  "is_default" INTEGER DEFAULT NULL,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "updated_at" TEXT DEFAULT NULL,
  "updated_by" TEXT DEFAULT '',
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "personnel" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "dept" TEXT DEFAULT NULL,
  "position" TEXT DEFAULT NULL,
  "role" TEXT DEFAULT NULL,
  "phone" TEXT DEFAULT NULL,
  "cert" TEXT DEFAULT NULL,
  "cert_no" TEXT DEFAULT NULL,
  "cert_org" TEXT DEFAULT NULL,
  "expire" TEXT DEFAULT NULL,
  "train" TEXT DEFAULT NULL,
  "train_content" TEXT DEFAULT NULL,
  "train_date" TEXT DEFAULT NULL,
  "train_org" TEXT DEFAULT NULL,
  "train_result" TEXT DEFAULT NULL,
  "user_id" INTEGER DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "proc_consumable" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "order_no" TEXT DEFAULT NULL,
  "supplier" TEXT DEFAULT NULL,
  "factory_name" TEXT DEFAULT NULL,
  "equip_name" TEXT DEFAULT NULL,
  "equip_model" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "amount" REAL DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "batch" TEXT DEFAULT NULL,
  "applicant" TEXT DEFAULT NULL,
  "acceptor" TEXT DEFAULT NULL,
  "flow" TEXT DEFAULT NULL,
  "prod_license_no" TEXT DEFAULT NULL,
  "reg_cert_no" TEXT DEFAULT NULL,
  "auditor" TEXT DEFAULT NULL,
  "audit_date" TEXT DEFAULT NULL,
  "audit_opinion" TEXT DEFAULT NULL,
  "audit_status" TEXT DEFAULT NULL,
  "linked_plan_id" INTEGER DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "purchaser_accepted" TEXT DEFAULT NULL,
  "purchaser_accepted_at" TEXT DEFAULT NULL,
  "purchaser_opinion" TEXT DEFAULT NULL,
  "quality_reviewed" TEXT DEFAULT NULL,
  "quality_reviewed_at" TEXT DEFAULT NULL,
  "quality_review_opinion" TEXT DEFAULT NULL,
  "warehouse_confirmed" TEXT DEFAULT NULL,
  "warehouse_confirmed_at" TEXT DEFAULT NULL,
  "warehouse_opinion" TEXT DEFAULT NULL,
  "quality_approved" TEXT DEFAULT NULL,
  "quality_approved_at" TEXT DEFAULT NULL,
  "quality_approval_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "proc_equipment" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "order_no" TEXT DEFAULT NULL,
  "supplier" TEXT DEFAULT NULL,
  "factory_name" TEXT DEFAULT NULL,
  "equip_name" TEXT DEFAULT NULL,
  "equip_model" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "amount" REAL DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "applicant" TEXT DEFAULT NULL,
  "acceptor" TEXT DEFAULT NULL,
  "flow" TEXT DEFAULT NULL,
  "prod_license_no" TEXT DEFAULT NULL,
  "reg_cert_no" TEXT DEFAULT NULL,
  "auditor" TEXT DEFAULT NULL,
  "audit_date" TEXT DEFAULT NULL,
  "audit_opinion" TEXT DEFAULT NULL,
  "audit_status" TEXT DEFAULT NULL,
  "linked_plan_id" INTEGER DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "purchaser_accepted" TEXT DEFAULT NULL,
  "purchaser_accepted_at" TEXT DEFAULT NULL,
  "purchaser_opinion" TEXT DEFAULT NULL,
  "quality_reviewed" TEXT DEFAULT NULL,
  "quality_reviewed_at" TEXT DEFAULT NULL,
  "quality_review_opinion" TEXT DEFAULT NULL,
  "warehouse_confirmed" TEXT DEFAULT NULL,
  "warehouse_confirmed_at" TEXT DEFAULT NULL,
  "warehouse_opinion" TEXT DEFAULT NULL,
  "quality_approved" TEXT DEFAULT NULL,
  "quality_approved_at" TEXT DEFAULT NULL,
  "quality_approval_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "product_acceptance" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "product_name" TEXT DEFAULT NULL,
  "product_udi" TEXT DEFAULT NULL,
  "batch_no" TEXT DEFAULT NULL,
  "manufacturer" TEXT DEFAULT NULL,
  "prod_license_no" TEXT DEFAULT NULL,
  "reg_cert_no" TEXT DEFAULT NULL,
  "supplier" TEXT DEFAULT NULL,
  "quantity" INTEGER DEFAULT NULL,
  "accept_date" TEXT DEFAULT NULL,
  "accept_person" TEXT DEFAULT NULL,
  "check_type" TEXT DEFAULT NULL,
  "appearance_check" TEXT DEFAULT NULL,
  "quantity_check" TEXT DEFAULT NULL,
  "quality_check" TEXT DEFAULT NULL,
  "overall_result" TEXT DEFAULT NULL,
  "production_date" TEXT DEFAULT NULL,
  "expiry_date" TEXT DEFAULT NULL,
  "remark" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "linked_proc_id" INTEGER DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "appearance_reviewer" TEXT DEFAULT NULL,
  "appearance_date" TEXT DEFAULT NULL,
  "appearance_remark" TEXT DEFAULT NULL,
  "quantity_reviewer" TEXT DEFAULT NULL,
  "quantity_date" TEXT DEFAULT NULL,
  "quantity_remark" TEXT DEFAULT NULL,
  "quality_reviewer" TEXT DEFAULT NULL,
  "quality_date" TEXT DEFAULT NULL,
  "quality_remark" TEXT DEFAULT NULL,
  "final_approver" TEXT DEFAULT NULL,
  "final_approval_date" TEXT DEFAULT NULL,
  "final_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "purchase_plan" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "plan_no" TEXT DEFAULT NULL,
  "name" TEXT DEFAULT NULL,
  "spec_model" TEXT DEFAULT NULL,
  "qty" INTEGER DEFAULT NULL,
  "budget" REAL DEFAULT NULL,
  "category" TEXT DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "factory_name" TEXT DEFAULT NULL,
  "prod_license_no" TEXT DEFAULT NULL,
  "reg_cert_no" TEXT DEFAULT NULL,
  "applicant" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "date" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "recall_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "notify_no" TEXT DEFAULT NULL,
  "product" TEXT DEFAULT NULL,
  "udi" TEXT DEFAULT NULL,
  "batch" TEXT DEFAULT NULL,
  "level" TEXT DEFAULT NULL,
  "reason" TEXT DEFAULT NULL,
  "source" TEXT DEFAULT NULL,
  "total_qty" INTEGER DEFAULT NULL,
  "recalled_qty" INTEGER DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "start_date" TEXT DEFAULT NULL,
  "finish_date" TEXT DEFAULT NULL,
  "disposal_method" TEXT DEFAULT NULL,
  "report_no" TEXT DEFAULT NULL,
  "reporter" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "repair_order" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "desc" TEXT DEFAULT NULL,
  "reporter" TEXT DEFAULT NULL,
  "report_time" TEXT DEFAULT NULL,
  "repairer" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "cost" REAL DEFAULT NULL,
  "customer_name" TEXT DEFAULT NULL,
  "dept_name" TEXT DEFAULT NULL,
  "serial_no" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "standard_check" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "equip_name" TEXT DEFAULT NULL,
  "equip_udi" TEXT DEFAULT NULL,
  "std_no" TEXT DEFAULT NULL,
  "result" TEXT DEFAULT NULL,
  "check_date" TEXT DEFAULT NULL,
  "std_name" TEXT DEFAULT NULL,
  "checker" TEXT DEFAULT NULL,
  "check_method" TEXT DEFAULT NULL,
  "conclusion" TEXT DEFAULT NULL,
  "dept" TEXT DEFAULT NULL,
  "rectify_measures" TEXT DEFAULT NULL,
  "rectify_deadline" TEXT DEFAULT NULL,
  "remark" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "supplier" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "code" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "med_biz_license_no" TEXT DEFAULT NULL,
  "license_expire" TEXT DEFAULT NULL,
  "gsp_cert" TEXT DEFAULT NULL,
  "scope" TEXT DEFAULT NULL,
  "reg_capital" TEXT DEFAULT NULL,
  "address" TEXT DEFAULT NULL,
  "legal_person" TEXT DEFAULT NULL,
  "contact" TEXT DEFAULT NULL,
  "phone" TEXT DEFAULT NULL,
  "email" TEXT DEFAULT NULL,
  "bank_info" TEXT DEFAULT NULL,
  "rating" TEXT DEFAULT NULL,
  "coop_since" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "review_status" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "class2_filing_no" TEXT DEFAULT NULL,
  "auth_period" TEXT DEFAULT NULL,
  "cert_update_status" TEXT DEFAULT NULL,
  "cert_update_id" INTEGER DEFAULT NULL,
  "cert_update_at" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "supplier_doc" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "supplier_id" INTEGER DEFAULT NULL,
  "doc_type" TEXT DEFAULT NULL,
  "title" TEXT DEFAULT NULL,
  "no" TEXT DEFAULT NULL,
  "issue_date" TEXT DEFAULT NULL,
  "expire_date" TEXT DEFAULT NULL,
  "file_type" TEXT DEFAULT NULL,
  "review_by" TEXT DEFAULT NULL,
  "review_date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "system_profile" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT NULL,
  "credit_code" TEXT DEFAULT NULL,
  "enterprise_type" TEXT DEFAULT NULL,
  "business_license" TEXT DEFAULT NULL,
  "business_license_expire" TEXT DEFAULT NULL,
  "med_device_license" TEXT DEFAULT NULL,
  "med_device_license_expire" TEXT DEFAULT NULL,
  "record_cert" TEXT DEFAULT NULL,
  "record_cert_expire" TEXT DEFAULT NULL,
  "legal_person" TEXT DEFAULT NULL,
  "enterprise_head" TEXT DEFAULT NULL,
  "quality_manager" TEXT DEFAULT NULL,
  "quality_dept" TEXT DEFAULT NULL,
  "reg_address" TEXT DEFAULT NULL,
  "warehouse_address" TEXT DEFAULT NULL,
  "business_area" TEXT DEFAULT NULL,
  "warehouse_area" TEXT DEFAULT NULL,
  "scope" TEXT DEFAULT NULL,
  "phone" TEXT DEFAULT NULL,
  "email" TEXT DEFAULT NULL,
  "bank_name" TEXT DEFAULT NULL,
  "bank_account" TEXT DEFAULT NULL,
  "establish_date" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "remark" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "updated_at" TEXT DEFAULT NULL,
  "workflow_status" TEXT DEFAULT NULL,
  "entered_by" TEXT DEFAULT NULL,
  "entered_at" TEXT DEFAULT NULL,
  "reviewed_by" TEXT DEFAULT NULL,
  "reviewed_at" TEXT DEFAULT NULL,
  "review_opinion" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "temp_humidity_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "hour" TEXT DEFAULT NULL,
  "temp" REAL DEFAULT NULL,
  "humid" REAL DEFAULT NULL,
  "record_date" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT '',
  "created_at" TEXT DEFAULT (datetime('now','localtime')),
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "training_plan" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "plan_no" TEXT DEFAULT NULL,
  "title" TEXT DEFAULT NULL,
  "period_type" TEXT DEFAULT NULL,
  "period_label" TEXT DEFAULT NULL,
  "year" TEXT DEFAULT NULL,
  "content" TEXT DEFAULT NULL,
  "target_audience" TEXT DEFAULT NULL,
  "trainer" TEXT DEFAULT NULL,
  "location" TEXT DEFAULT NULL,
  "planned_date" TEXT DEFAULT NULL,
  "planned_hours" REAL DEFAULT NULL,
  "status" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "approved_by" TEXT DEFAULT NULL,
  "approved_at" TEXT DEFAULT NULL,
  "approval_opinion" TEXT DEFAULT NULL,
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "training_record" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "record_no" TEXT DEFAULT NULL,
  "plan_id" INTEGER DEFAULT NULL,
  "plan_no" TEXT DEFAULT NULL,
  "title" TEXT DEFAULT NULL,
  "training_type" TEXT DEFAULT NULL,
  "content" TEXT DEFAULT NULL,
  "training_date" TEXT DEFAULT NULL,
  "location" TEXT DEFAULT NULL,
  "trainer" TEXT DEFAULT NULL,
  "duration_hours" REAL DEFAULT NULL,
  "participants" TEXT DEFAULT NULL,
  "participant_count" INTEGER DEFAULT NULL,
  "assessment" TEXT DEFAULT NULL,
  "summary" TEXT DEFAULT NULL,
  "pdf_filename" TEXT DEFAULT NULL,
  "pdf_path" TEXT DEFAULT NULL,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT NULL,
  "updated_by" TEXT DEFAULT '',
  "updated_at" TEXT DEFAULT (datetime('now','localtime')),
  "deleted" INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_acceptance_record_equip_udi" ON "acceptance_record" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_adverse_event_status" ON "adverse_event" ("status");
CREATE INDEX IF NOT EXISTS "idx_adverse_event_equip_udi" ON "adverse_event" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_approval_notification_module" ON "approval_notification" ("module");
CREATE INDEX IF NOT EXISTS "idx_calibration_plan_status" ON "calibration_plan" ("status");
CREATE INDEX IF NOT EXISTS "idx_calibration_plan_equip_udi" ON "calibration_plan" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_calibration_record_equip_udi" ON "calibration_record" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_cert_update_request_module" ON "cert_update_request" ("module");
CREATE INDEX IF NOT EXISTS "idx_cure_record_equip_udi" ON "cure_record" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_customer_archive_name" ON "customer_archive" ("name");
CREATE INDEX IF NOT EXISTS "idx_customer_archive_status" ON "customer_archive" ("status");
CREATE INDEX IF NOT EXISTS "idx_data_bridge_log_status" ON "data_bridge_log" ("status");
CREATE INDEX IF NOT EXISTS "idx_equip_acceptance_equip_udi" ON "equip_acceptance" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_equip_inspection_equip_udi" ON "equip_inspection" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_equip_ledger_udi" ON "equip_ledger" ("udi");
CREATE INDEX IF NOT EXISTS "idx_equip_ledger_name" ON "equip_ledger" ("name");
CREATE INDEX IF NOT EXISTS "idx_equip_ledger_status" ON "equip_ledger" ("status");
CREATE INDEX IF NOT EXISTS "idx_expiry_warning_udi" ON "expiry_warning" ("udi");
CREATE INDEX IF NOT EXISTS "idx_expiry_warning_name" ON "expiry_warning" ("name");
CREATE INDEX IF NOT EXISTS "idx_expiry_warning_batch" ON "expiry_warning" ("batch");
CREATE INDEX IF NOT EXISTS "idx_expiry_warning_status" ON "expiry_warning" ("status");
CREATE INDEX IF NOT EXISTS "idx_first_factory_audit_name" ON "first_factory_audit" ("name");
CREATE INDEX IF NOT EXISTS "idx_first_factory_audit_status" ON "first_factory_audit" ("status");
CREATE INDEX IF NOT EXISTS "idx_first_product_audit_name" ON "first_product_audit" ("name");
CREATE INDEX IF NOT EXISTS "idx_first_product_audit_status" ON "first_product_audit" ("status");
CREATE INDEX IF NOT EXISTS "idx_health_checkup_plan_name" ON "health_checkup_plan" ("name");
CREATE INDEX IF NOT EXISTS "idx_health_checkup_plan_status" ON "health_checkup_plan" ("status");
CREATE INDEX IF NOT EXISTS "idx_health_record_name" ON "health_record" ("name");
CREATE INDEX IF NOT EXISTS "idx_inventory_udi" ON "inventory" ("udi");
CREATE INDEX IF NOT EXISTS "idx_inventory_name" ON "inventory" ("name");
CREATE INDEX IF NOT EXISTS "idx_inventory_batch" ON "inventory" ("batch");
CREATE INDEX IF NOT EXISTS "idx_inventory_status" ON "inventory" ("status");
CREATE INDEX IF NOT EXISTS "idx_inventory_log_udi" ON "inventory_log" ("udi");
CREATE INDEX IF NOT EXISTS "idx_inventory_log_name" ON "inventory_log" ("name");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_status" ON "knowledge_base" ("status");
CREATE INDEX IF NOT EXISTS "idx_maintenance_plan_status" ON "maintenance_plan" ("status");
CREATE INDEX IF NOT EXISTS "idx_maintenance_plan_equip_udi" ON "maintenance_plan" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_national_standard_name" ON "national_standard" ("name");
CREATE INDEX IF NOT EXISTS "idx_national_standard_status" ON "national_standard" ("status");
CREATE INDEX IF NOT EXISTS "idx_outbound_record_batch" ON "outbound_record" ("batch");
CREATE INDEX IF NOT EXISTS "idx_outbound_record_status" ON "outbound_record" ("status");
CREATE INDEX IF NOT EXISTS "idx_outbound_record_order_no" ON "outbound_record" ("order_no");
CREATE INDEX IF NOT EXISTS "idx_outbound_record_equip_udi" ON "outbound_record" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_outbound_template_name" ON "outbound_template" ("name");
CREATE INDEX IF NOT EXISTS "idx_personnel_name" ON "personnel" ("name");
CREATE INDEX IF NOT EXISTS "idx_personnel_status" ON "personnel" ("status");
CREATE INDEX IF NOT EXISTS "idx_proc_consumable_batch" ON "proc_consumable" ("batch");
CREATE INDEX IF NOT EXISTS "idx_proc_consumable_status" ON "proc_consumable" ("status");
CREATE INDEX IF NOT EXISTS "idx_proc_consumable_order_no" ON "proc_consumable" ("order_no");
CREATE INDEX IF NOT EXISTS "idx_proc_equipment_status" ON "proc_equipment" ("status");
CREATE INDEX IF NOT EXISTS "idx_proc_equipment_order_no" ON "proc_equipment" ("order_no");
CREATE INDEX IF NOT EXISTS "idx_product_acceptance_batch_no" ON "product_acceptance" ("batch_no");
CREATE INDEX IF NOT EXISTS "idx_purchase_plan_name" ON "purchase_plan" ("name");
CREATE INDEX IF NOT EXISTS "idx_purchase_plan_status" ON "purchase_plan" ("status");
CREATE INDEX IF NOT EXISTS "idx_purchase_plan_plan_no" ON "purchase_plan" ("plan_no");
CREATE INDEX IF NOT EXISTS "idx_recall_record_udi" ON "recall_record" ("udi");
CREATE INDEX IF NOT EXISTS "idx_recall_record_batch" ON "recall_record" ("batch");
CREATE INDEX IF NOT EXISTS "idx_recall_record_status" ON "recall_record" ("status");
CREATE INDEX IF NOT EXISTS "idx_repair_order_status" ON "repair_order" ("status");
CREATE INDEX IF NOT EXISTS "idx_repair_order_equip_udi" ON "repair_order" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_standard_check_equip_udi" ON "standard_check" ("equip_udi");
CREATE INDEX IF NOT EXISTS "idx_supplier_name" ON "supplier" ("name");
CREATE INDEX IF NOT EXISTS "idx_supplier_status" ON "supplier" ("status");
CREATE INDEX IF NOT EXISTS "idx_supplier_doc_status" ON "supplier_doc" ("status");
CREATE INDEX IF NOT EXISTS "idx_supplier_doc_supplier_id" ON "supplier_doc" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_system_profile_name" ON "system_profile" ("name");
CREATE INDEX IF NOT EXISTS "idx_system_profile_status" ON "system_profile" ("status");
CREATE INDEX IF NOT EXISTS "idx_training_plan_status" ON "training_plan" ("status");
CREATE INDEX IF NOT EXISTS "idx_training_plan_plan_no" ON "training_plan" ("plan_no");
CREATE INDEX IF NOT EXISTS "idx_training_record_plan_no" ON "training_record" ("plan_no");
CREATE INDEX IF NOT EXISTS "idx_training_record_record_no" ON "training_record" ("record_no");
