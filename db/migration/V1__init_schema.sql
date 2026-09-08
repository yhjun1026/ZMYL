-- ============================================================
-- 卓盟医疗器械管理平台 V1 基线 Schema（由原 SQLite 库规范化生成）
-- 生成时间: 2026-08-18  规范: utf8mb4 / InnoDB / 审计字段 / 逻辑删除
-- ============================================================
SET NAMES utf8mb4;

-- 原表: acceptance_record
DROP TABLE IF EXISTS `acceptance_record`;
CREATE TABLE `acceptance_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `supplier` VARCHAR(200) DEFAULT NULL COMMENT 'supplier',
  `person` VARCHAR(100) DEFAULT NULL COMMENT 'person',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `issue` TEXT DEFAULT NULL COMMENT 'issue',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_acceptance_record_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='acceptance_record';

-- 原表: adverse_event
DROP TABLE IF EXISTS `adverse_event`;
CREATE TABLE `adverse_event` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `desc` TEXT DEFAULT NULL COMMENT 'desc',
  `severity` VARCHAR(40) DEFAULT NULL COMMENT 'severity',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `reporter` VARCHAR(100) DEFAULT NULL COMMENT 'reporter',
  `report_date` DATETIME DEFAULT NULL COMMENT 'report_date',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_adverse_event_status` (`status`),
  KEY `idx_adverse_event_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='adverse_event';

-- 原表: approval_notification
DROP TABLE IF EXISTS `approval_notification`;
CREATE TABLE `approval_notification` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title` VARCHAR(400) DEFAULT NULL COMMENT 'title',
  `content` TEXT DEFAULT NULL COMMENT 'content',
  `module` VARCHAR(100) DEFAULT NULL COMMENT 'module',
  `ref_no` VARCHAR(100) DEFAULT NULL COMMENT 'ref_no',
  `ref_id` BIGINT DEFAULT NULL COMMENT 'ref_id',
  `action_type` VARCHAR(60) DEFAULT NULL COMMENT 'action_type',
  `target_role` VARCHAR(100) DEFAULT NULL COMMENT 'target_role',
  `target_user` VARCHAR(100) DEFAULT NULL COMMENT 'target_user',
  `source_user` VARCHAR(100) DEFAULT NULL COMMENT 'source_user',
  `is_read` TINYINT(1) DEFAULT NULL COMMENT 'is_read',
  `read_at` DATETIME DEFAULT NULL COMMENT 'read_at',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_approval_notification_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='approval_notification';

-- 原表: calibration_plan
DROP TABLE IF EXISTS `calibration_plan`;
CREATE TABLE `calibration_plan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `cal_no` VARCHAR(100) DEFAULT NULL COMMENT 'cal_no',
  `last_cal` VARCHAR(40) DEFAULT NULL COMMENT 'last_cal',
  `next_cal` VARCHAR(40) DEFAULT NULL COMMENT 'next_cal',
  `org` VARCHAR(200) DEFAULT NULL COMMENT 'org',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_calibration_plan_status` (`status`),
  KEY `idx_calibration_plan_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='calibration_plan';

-- 原表: calibration_record
DROP TABLE IF EXISTS `calibration_record`;
CREATE TABLE `calibration_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `cal_date` DATETIME DEFAULT NULL COMMENT 'cal_date',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `cert` VARCHAR(100) DEFAULT NULL COMMENT 'cert',
  `org` VARCHAR(200) DEFAULT NULL COMMENT 'org',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_calibration_record_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='calibration_record';

-- 原表: cert_update_request
DROP TABLE IF EXISTS `cert_update_request`;
CREATE TABLE `cert_update_request` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `module` VARCHAR(60) DEFAULT NULL COMMENT 'module',
  `record_id` BIGINT DEFAULT NULL COMMENT 'record_id',
  `record_name` VARCHAR(500) DEFAULT NULL COMMENT 'record_name',
  `field_changes` TEXT DEFAULT NULL COMMENT 'field_changes',
  `new_data` TEXT DEFAULT NULL COMMENT 'new_data',
  `update_reason` TEXT DEFAULT NULL COMMENT 'update_reason',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `submitted_by` VARCHAR(100) DEFAULT NULL COMMENT 'submitted_by',
  `submitted_at` DATETIME DEFAULT NULL COMMENT 'submitted_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `applied_at` DATETIME DEFAULT NULL COMMENT 'applied_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_cert_update_request_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='cert_update_request';

-- 原表: cure_record
DROP TABLE IF EXISTS `cure_record`;
CREATE TABLE `cure_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `person` VARCHAR(100) DEFAULT NULL COMMENT 'person',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `temp` VARCHAR(20) DEFAULT NULL COMMENT 'temp',
  `humid` VARCHAR(20) DEFAULT NULL COMMENT 'humid',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `next_date` DATETIME DEFAULT NULL COMMENT 'next_date',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_cure_record_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='cure_record';

-- 原表: customer_archive
DROP TABLE IF EXISTS `customer_archive`;
CREATE TABLE `customer_archive` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `code` VARCHAR(100) DEFAULT NULL COMMENT 'code',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `license` VARCHAR(200) DEFAULT NULL COMMENT 'license',
  `license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'license_expire',
  `contact` VARCHAR(100) DEFAULT NULL COMMENT 'contact',
  `phone` VARCHAR(60) DEFAULT NULL COMMENT 'phone',
  `address` VARCHAR(500) DEFAULT NULL COMMENT 'address',
  `credit_level` VARCHAR(40) DEFAULT NULL COMMENT 'credit_level',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `audit_status` VARCHAR(40) DEFAULT NULL COMMENT 'audit_status',
  `auditor` VARCHAR(100) DEFAULT NULL COMMENT 'auditor',
  `audit_date` DATETIME DEFAULT NULL COMMENT 'audit_date',
  `audit_opinion` TEXT DEFAULT NULL COMMENT 'audit_opinion',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `cert_update_status` VARCHAR(40) DEFAULT NULL COMMENT 'cert_update_status',
  `cert_update_id` BIGINT DEFAULT NULL COMMENT 'cert_update_id',
  `cert_update_at` DATETIME DEFAULT NULL COMMENT 'cert_update_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_customer_archive_name` (`name`),
  KEY `idx_customer_archive_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='customer_archive';

-- 原表: data_bridge_log
DROP TABLE IF EXISTS `data_bridge_log`;
CREATE TABLE `data_bridge_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bridge_type` VARCHAR(100) DEFAULT NULL COMMENT 'bridge_type',
  `source_module` VARCHAR(100) DEFAULT NULL COMMENT 'source_module',
  `source_ref` VARCHAR(200) DEFAULT NULL COMMENT 'source_ref',
  `target_module` VARCHAR(100) DEFAULT NULL COMMENT 'target_module',
  `target_ref` VARCHAR(200) DEFAULT NULL COMMENT 'target_ref',
  `description` TEXT DEFAULT NULL COMMENT 'description',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_data_bridge_log_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='data_bridge_log';

-- 原表: equip_acceptance
DROP TABLE IF EXISTS `equip_acceptance`;
CREATE TABLE `equip_acceptance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `supplier` VARCHAR(200) DEFAULT NULL COMMENT 'supplier',
  `customer_name` VARCHAR(400) DEFAULT NULL COMMENT 'customer_name',
  `dept_name` VARCHAR(200) DEFAULT NULL COMMENT 'dept_name',
  `serial_no` VARCHAR(200) DEFAULT NULL COMMENT 'serial_no',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `use_years` VARCHAR(100) DEFAULT NULL COMMENT 'use_years',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `person` VARCHAR(100) DEFAULT NULL COMMENT 'person',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `step` VARCHAR(40) DEFAULT NULL COMMENT 'step',
  `check_items` TEXT DEFAULT NULL COMMENT 'check_items',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_equip_acceptance_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='equip_acceptance';

-- 原表: equip_inspection
DROP TABLE IF EXISTS `equip_inspection`;
CREATE TABLE `equip_inspection` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `customer_name` VARCHAR(400) DEFAULT NULL COMMENT 'customer_name',
  `dept_name` VARCHAR(200) DEFAULT NULL COMMENT 'dept_name',
  `serial_no` VARCHAR(200) DEFAULT NULL COMMENT 'serial_no',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `inspector` VARCHAR(100) DEFAULT NULL COMMENT 'inspector',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `status_desc` TEXT DEFAULT NULL COMMENT 'status_desc',
  `note` TEXT DEFAULT NULL COMMENT 'note',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_equip_inspection_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='equip_inspection';

-- 原表: equip_ledger
DROP TABLE IF EXISTS `equip_ledger`;
CREATE TABLE `equip_ledger` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `udi` VARCHAR(100) DEFAULT NULL COMMENT 'udi',
  `name` VARCHAR(200) DEFAULT NULL COMMENT 'name',
  `model` VARCHAR(200) DEFAULT NULL COMMENT 'model',
  `cls` VARCHAR(40) DEFAULT NULL COMMENT 'cls',
  `risk` VARCHAR(40) DEFAULT NULL COMMENT 'risk',
  `cert` VARCHAR(200) DEFAULT NULL COMMENT 'cert',
  `factory` VARCHAR(200) DEFAULT NULL COMMENT 'factory',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `customer_name` VARCHAR(400) DEFAULT NULL COMMENT 'customer_name',
  `production_date` DATETIME DEFAULT NULL COMMENT 'production_date',
  `serial_no` VARCHAR(200) DEFAULT NULL COMMENT 'serial_no',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `service_life` VARCHAR(100) DEFAULT NULL COMMENT 'service_life',
  `sale_price` DOUBLE DEFAULT NULL COMMENT 'sale_price',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_equip_ledger_udi` (`udi`),
  KEY `idx_equip_ledger_name` (`name`),
  KEY `idx_equip_ledger_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='equip_ledger';

-- 原表: expiry_warning
DROP TABLE IF EXISTS `expiry_warning`;
CREATE TABLE `expiry_warning` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `udi` VARCHAR(100) DEFAULT NULL COMMENT 'udi',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `batch` VARCHAR(100) DEFAULT NULL COMMENT 'batch',
  `prod_date` DATETIME DEFAULT NULL COMMENT 'prod_date',
  `expire_date` DATETIME DEFAULT NULL COMMENT 'expire_date',
  `remain_days` BIGINT DEFAULT NULL COMMENT 'remain_days',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `manufacturer` VARCHAR(400) DEFAULT NULL COMMENT 'manufacturer',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_expiry_warning_udi` (`udi`),
  KEY `idx_expiry_warning_name` (`name`),
  KEY `idx_expiry_warning_batch` (`batch`),
  KEY `idx_expiry_warning_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='expiry_warning';

-- 原表: finance_record
DROP TABLE IF EXISTS `finance_record`;
CREATE TABLE `finance_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `category` VARCHAR(40) DEFAULT NULL COMMENT 'category',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `amount` DOUBLE DEFAULT NULL COMMENT 'amount',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `ref_no` VARCHAR(100) DEFAULT NULL COMMENT 'ref_no',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `operator` VARCHAR(100) DEFAULT NULL COMMENT 'operator',
  `note` TEXT DEFAULT NULL COMMENT 'note',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='finance_record';

-- 原表: first_factory_audit
DROP TABLE IF EXISTS `first_factory_audit`;
CREATE TABLE `first_factory_audit` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `code` VARCHAR(100) DEFAULT NULL COMMENT 'code',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `license` VARCHAR(200) DEFAULT NULL COMMENT 'license',
  `license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'license_expire',
  `gmp_cert` VARCHAR(200) DEFAULT NULL COMMENT 'gmp_cert',
  `gmp_expire` VARCHAR(40) DEFAULT NULL COMMENT 'gmp_expire',
  `iso_cert` VARCHAR(200) DEFAULT NULL COMMENT 'iso_cert',
  `iso_expire` VARCHAR(40) DEFAULT NULL COMMENT 'iso_expire',
  `business_license` VARCHAR(200) DEFAULT NULL COMMENT 'business_license',
  `scope` VARCHAR(500) DEFAULT NULL COMMENT 'scope',
  `address` VARCHAR(500) DEFAULT NULL COMMENT 'address',
  `legal_person` VARCHAR(100) DEFAULT NULL COMMENT 'legal_person',
  `contact` VARCHAR(100) DEFAULT NULL COMMENT 'contact',
  `phone` VARCHAR(60) DEFAULT NULL COMMENT 'phone',
  `applicant` VARCHAR(100) DEFAULT NULL COMMENT 'applicant',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `first_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'first_reviewer',
  `first_review_date` DATETIME DEFAULT NULL COMMENT 'first_review_date',
  `first_review_opinion` TEXT DEFAULT NULL COMMENT 'first_review_opinion',
  `second_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'second_reviewer',
  `second_review_date` DATETIME DEFAULT NULL COMMENT 'second_review_date',
  `second_review_opinion` TEXT DEFAULT NULL COMMENT 'second_review_opinion',
  `audit_opinion` TEXT DEFAULT NULL COMMENT 'audit_opinion',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `cert_update_status` VARCHAR(40) DEFAULT NULL COMMENT 'cert_update_status',
  `cert_update_id` BIGINT DEFAULT NULL COMMENT 'cert_update_id',
  `cert_update_at` DATETIME DEFAULT NULL COMMENT 'cert_update_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_first_factory_audit_name` (`name`),
  KEY `idx_first_factory_audit_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='first_factory_audit';

-- 原表: first_product_audit
DROP TABLE IF EXISTS `first_product_audit`;
CREATE TABLE `first_product_audit` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `spec` VARCHAR(400) DEFAULT NULL COMMENT 'spec',
  `factory` VARCHAR(400) DEFAULT NULL COMMENT 'factory',
  `cls` VARCHAR(40) DEFAULT NULL COMMENT 'cls',
  `reg_cert` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert',
  `reg_cert_expire` VARCHAR(40) DEFAULT NULL COMMENT 'reg_cert_expire',
  `license` VARCHAR(200) DEFAULT NULL COMMENT 'license',
  `license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'license_expire',
  `func_desc` TEXT DEFAULT NULL COMMENT 'func_desc',
  `comp_desc` TEXT DEFAULT NULL COMMENT 'comp_desc',
  `applicant` VARCHAR(100) DEFAULT NULL COMMENT 'applicant',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `first_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'first_reviewer',
  `first_review_date` DATETIME DEFAULT NULL COMMENT 'first_review_date',
  `first_review_opinion` TEXT DEFAULT NULL COMMENT 'first_review_opinion',
  `second_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'second_reviewer',
  `second_review_date` DATETIME DEFAULT NULL COMMENT 'second_review_date',
  `second_review_opinion` TEXT DEFAULT NULL COMMENT 'second_review_opinion',
  `audit_opinion` TEXT DEFAULT NULL COMMENT 'audit_opinion',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `cert_update_status` VARCHAR(40) DEFAULT NULL COMMENT 'cert_update_status',
  `cert_update_id` BIGINT DEFAULT NULL COMMENT 'cert_update_id',
  `cert_update_at` DATETIME DEFAULT NULL COMMENT 'cert_update_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_first_product_audit_name` (`name`),
  KEY `idx_first_product_audit_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='first_product_audit';

-- 原表: health_checkup_plan
DROP TABLE IF EXISTS `health_checkup_plan`;
CREATE TABLE `health_checkup_plan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(100) DEFAULT NULL COMMENT 'name',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `plan_year` VARCHAR(20) DEFAULT NULL COMMENT 'plan_year',
  `plan_date` DATETIME DEFAULT NULL COMMENT 'plan_date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `checkup_items` TEXT DEFAULT NULL COMMENT 'checkup_items',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_health_checkup_plan_name` (`name`),
  KEY `idx_health_checkup_plan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='health_checkup_plan';

-- 原表: health_record
DROP TABLE IF EXISTS `health_record`;
CREATE TABLE `health_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(100) DEFAULT NULL COMMENT 'name',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `position` VARCHAR(200) DEFAULT NULL COMMENT 'position',
  `health_cert_no` VARCHAR(100) DEFAULT NULL COMMENT 'health_cert_no',
  `health_cert_org` VARCHAR(200) DEFAULT NULL COMMENT 'health_cert_org',
  `health_cert_expire` VARCHAR(40) DEFAULT NULL COMMENT 'health_cert_expire',
  `checkup_date` DATETIME DEFAULT NULL COMMENT 'checkup_date',
  `checkup_result` VARCHAR(40) DEFAULT NULL COMMENT 'checkup_result',
  `work_restriction` VARCHAR(100) DEFAULT NULL COMMENT 'work_restriction',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_health_record_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='health_record';

-- 原表: inventory
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `udi` VARCHAR(100) DEFAULT NULL COMMENT 'udi',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `spec` VARCHAR(200) DEFAULT NULL COMMENT 'spec',
  `batch` VARCHAR(200) DEFAULT NULL COMMENT 'batch',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `unit` VARCHAR(40) DEFAULT NULL COMMENT 'unit',
  `min_stock` BIGINT DEFAULT NULL COMMENT 'min_stock',
  `location` VARCHAR(200) DEFAULT NULL COMMENT 'location',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `ref_no` VARCHAR(200) DEFAULT NULL COMMENT 'ref_no',
  `manufacturer` VARCHAR(400) DEFAULT NULL COMMENT 'manufacturer',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_inventory_udi` (`udi`),
  KEY `idx_inventory_name` (`name`),
  KEY `idx_inventory_batch` (`batch`),
  KEY `idx_inventory_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='inventory';

-- 原表: inventory_log
DROP TABLE IF EXISTS `inventory_log`;
CREATE TABLE `inventory_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `udi` VARCHAR(100) DEFAULT NULL COMMENT 'udi',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `change_qty` BIGINT DEFAULT NULL COMMENT 'change_qty',
  `before_qty` BIGINT DEFAULT NULL COMMENT 'before_qty',
  `after_qty` BIGINT DEFAULT NULL COMMENT 'after_qty',
  `ref_no` VARCHAR(100) DEFAULT NULL COMMENT 'ref_no',
  `operator` VARCHAR(100) DEFAULT NULL COMMENT 'operator',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `note` TEXT DEFAULT NULL COMMENT 'note',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_inventory_log_udi` (`udi`),
  KEY `idx_inventory_log_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='inventory_log';

-- 原表: knowledge_base
DROP TABLE IF EXISTS `knowledge_base`;
CREATE TABLE `knowledge_base` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `category` VARCHAR(40) DEFAULT NULL COMMENT 'category',
  `code` VARCHAR(60) DEFAULT NULL COMMENT 'code',
  `title` VARCHAR(500) DEFAULT NULL COMMENT 'title',
  `gsp_ref` VARCHAR(200) DEFAULT NULL COMMENT 'gsp_ref',
  `summary` VARCHAR(500) DEFAULT NULL COMMENT 'summary',
  `content` TEXT DEFAULT NULL COMMENT 'content',
  `steps` TEXT DEFAULT NULL COMMENT 'steps',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `tags` VARCHAR(400) DEFAULT NULL COMMENT 'tags',
  `view_count` BIGINT DEFAULT NULL COMMENT 'view_count',
  `sort_order` BIGINT DEFAULT NULL COMMENT 'sort_order',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'created_by',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `updated_at` DATETIME DEFAULT NULL COMMENT 'updated_at',
  `subcategory` VARCHAR(100) DEFAULT NULL COMMENT 'subcategory',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_knowledge_base_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='knowledge_base';

-- 原表: maintenance_plan
DROP TABLE IF EXISTS `maintenance_plan`;
CREATE TABLE `maintenance_plan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `plan_date` DATETIME DEFAULT NULL COMMENT 'plan_date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `person` VARCHAR(100) DEFAULT NULL COMMENT 'person',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT 'customer_name',
  `dept_name` VARCHAR(200) DEFAULT NULL COMMENT 'dept_name',
  `serial_no` VARCHAR(200) DEFAULT NULL COMMENT 'serial_no',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_maintenance_plan_status` (`status`),
  KEY `idx_maintenance_plan_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='maintenance_plan';

-- 原表: national_standard
DROP TABLE IF EXISTS `national_standard`;
CREATE TABLE `national_standard` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `std_no` VARCHAR(100) DEFAULT NULL COMMENT 'std_no',
  `name` VARCHAR(500) DEFAULT NULL COMMENT 'name',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `issue_date` DATETIME DEFAULT NULL COMMENT 'issue_date',
  `scope` TEXT DEFAULT NULL COMMENT 'scope',
  `impl_date` DATETIME DEFAULT NULL COMMENT 'impl_date',
  `replace_std` VARCHAR(500) DEFAULT NULL COMMENT 'replace_std',
  `summary` TEXT DEFAULT NULL COMMENT 'summary',
  `compliance_req` TEXT DEFAULT NULL COMMENT 'compliance_req',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_national_standard_name` (`name`),
  KEY `idx_national_standard_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='national_standard';

-- 原表: operation_log
DROP TABLE IF EXISTS `operation_log`;
CREATE TABLE `operation_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `time` DATETIME DEFAULT NULL COMMENT 'time',
  `text` TEXT DEFAULT NULL COMMENT 'text',
  `user` VARCHAR(100) DEFAULT NULL COMMENT 'user',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='operation_log';

-- 原表: outbound_record
DROP TABLE IF EXISTS `outbound_record`;
CREATE TABLE `outbound_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_no` VARCHAR(100) DEFAULT NULL COMMENT 'order_no',
  `customer` VARCHAR(400) DEFAULT NULL COMMENT 'customer',
  `customer_license` VARCHAR(200) DEFAULT NULL COMMENT 'customer_license',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `batch` VARCHAR(100) DEFAULT NULL COMMENT 'batch',
  `reg_cert` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert',
  `factory_name` VARCHAR(200) DEFAULT NULL COMMENT 'factory_name',
  `prod_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'prod_license_no',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `unit` VARCHAR(40) DEFAULT NULL COMMENT 'unit',
  `price` DOUBLE DEFAULT NULL COMMENT 'price',
  `total` DOUBLE DEFAULT NULL COMMENT 'total',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `prod_date` DATETIME DEFAULT NULL COMMENT 'prod_date',
  `expire_date` DATETIME DEFAULT NULL COMMENT 'expire_date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `operator` VARCHAR(100) DEFAULT NULL COMMENT 'operator',
  `reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'reviewer',
  `quality_approver` VARCHAR(100) DEFAULT NULL COMMENT 'quality_approver',
  `recipient` VARCHAR(100) DEFAULT NULL COMMENT 'recipient',
  `transport_condition` VARCHAR(200) DEFAULT NULL COMMENT 'transport_condition',
  `storage_condition` VARCHAR(200) DEFAULT NULL COMMENT 'storage_condition',
  `note` TEXT DEFAULT NULL COMMENT 'note',
  `audit_trail` TEXT DEFAULT NULL COMMENT 'audit_trail',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_outbound_record_batch` (`batch`),
  KEY `idx_outbound_record_status` (`status`),
  KEY `idx_outbound_record_order_no` (`order_no`),
  KEY `idx_outbound_record_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='outbound_record';

-- 原表: outbound_template
DROP TABLE IF EXISTS `outbound_template`;
CREATE TABLE `outbound_template` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(200) DEFAULT NULL COMMENT 'name',
  `description` VARCHAR(500) DEFAULT NULL COMMENT 'description',
  `config` TEXT DEFAULT NULL COMMENT 'config',
  `is_default` TINYINT(1) DEFAULT NULL COMMENT 'is_default',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'created_by',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `updated_at` DATETIME DEFAULT NULL COMMENT 'updated_at',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_outbound_template_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='outbound_template';

-- 原表: personnel
DROP TABLE IF EXISTS `personnel`;
CREATE TABLE `personnel` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(100) DEFAULT NULL COMMENT 'name',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `position` VARCHAR(200) DEFAULT NULL COMMENT 'position',
  `role` VARCHAR(200) DEFAULT NULL COMMENT 'role',
  `phone` VARCHAR(60) DEFAULT NULL COMMENT 'phone',
  `cert` VARCHAR(400) DEFAULT NULL COMMENT 'cert',
  `cert_no` VARCHAR(200) DEFAULT NULL COMMENT 'cert_no',
  `cert_org` VARCHAR(200) DEFAULT NULL COMMENT 'cert_org',
  `expire` VARCHAR(40) DEFAULT NULL COMMENT 'expire',
  `train` VARCHAR(200) DEFAULT NULL COMMENT 'train',
  `train_content` TEXT DEFAULT NULL COMMENT 'train_content',
  `train_date` DATETIME DEFAULT NULL COMMENT 'train_date',
  `train_org` VARCHAR(200) DEFAULT NULL COMMENT 'train_org',
  `train_result` VARCHAR(40) DEFAULT NULL COMMENT 'train_result',
  `user_id` BIGINT DEFAULT NULL COMMENT 'user_id',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_personnel_name` (`name`),
  KEY `idx_personnel_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='personnel';

-- 原表: proc_consumable
DROP TABLE IF EXISTS `proc_consumable`;
CREATE TABLE `proc_consumable` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_no` VARCHAR(100) DEFAULT NULL COMMENT 'order_no',
  `supplier` VARCHAR(200) DEFAULT NULL COMMENT 'supplier',
  `factory_name` VARCHAR(200) DEFAULT NULL COMMENT 'factory_name',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_model` VARCHAR(200) DEFAULT NULL COMMENT 'equip_model',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `amount` DOUBLE DEFAULT NULL COMMENT 'amount',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `batch` VARCHAR(100) DEFAULT NULL COMMENT 'batch',
  `applicant` VARCHAR(100) DEFAULT NULL COMMENT 'applicant',
  `acceptor` VARCHAR(100) DEFAULT NULL COMMENT 'acceptor',
  `flow` VARCHAR(200) DEFAULT NULL COMMENT 'flow',
  `prod_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'prod_license_no',
  `reg_cert_no` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert_no',
  `auditor` VARCHAR(100) DEFAULT NULL COMMENT 'auditor',
  `audit_date` DATETIME DEFAULT NULL COMMENT 'audit_date',
  `audit_opinion` TEXT DEFAULT NULL COMMENT 'audit_opinion',
  `audit_status` VARCHAR(40) DEFAULT NULL COMMENT 'audit_status',
  `linked_plan_id` BIGINT DEFAULT NULL COMMENT 'linked_plan_id',
  `workflow_status` TEXT DEFAULT NULL COMMENT 'workflow_status',
  `purchaser_accepted` TEXT DEFAULT NULL COMMENT 'purchaser_accepted',
  `purchaser_accepted_at` DATETIME DEFAULT NULL COMMENT 'purchaser_accepted_at',
  `purchaser_opinion` TEXT DEFAULT NULL COMMENT 'purchaser_opinion',
  `quality_reviewed` TEXT DEFAULT NULL COMMENT 'quality_reviewed',
  `quality_reviewed_at` DATETIME DEFAULT NULL COMMENT 'quality_reviewed_at',
  `quality_review_opinion` TEXT DEFAULT NULL COMMENT 'quality_review_opinion',
  `warehouse_confirmed` TEXT DEFAULT NULL COMMENT 'warehouse_confirmed',
  `warehouse_confirmed_at` DATETIME DEFAULT NULL COMMENT 'warehouse_confirmed_at',
  `warehouse_opinion` TEXT DEFAULT NULL COMMENT 'warehouse_opinion',
  `quality_approved` TEXT DEFAULT NULL COMMENT 'quality_approved',
  `quality_approved_at` DATETIME DEFAULT NULL COMMENT 'quality_approved_at',
  `quality_approval_opinion` TEXT DEFAULT NULL COMMENT 'quality_approval_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_proc_consumable_batch` (`batch`),
  KEY `idx_proc_consumable_status` (`status`),
  KEY `idx_proc_consumable_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='proc_consumable';

-- 原表: proc_equipment
DROP TABLE IF EXISTS `proc_equipment`;
CREATE TABLE `proc_equipment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_no` VARCHAR(100) DEFAULT NULL COMMENT 'order_no',
  `supplier` VARCHAR(200) DEFAULT NULL COMMENT 'supplier',
  `factory_name` VARCHAR(200) DEFAULT NULL COMMENT 'factory_name',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_model` VARCHAR(200) DEFAULT NULL COMMENT 'equip_model',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `amount` DOUBLE DEFAULT NULL COMMENT 'amount',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `type` VARCHAR(40) DEFAULT NULL COMMENT 'type',
  `applicant` VARCHAR(100) DEFAULT NULL COMMENT 'applicant',
  `acceptor` VARCHAR(100) DEFAULT NULL COMMENT 'acceptor',
  `flow` VARCHAR(200) DEFAULT NULL COMMENT 'flow',
  `prod_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'prod_license_no',
  `reg_cert_no` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert_no',
  `auditor` VARCHAR(100) DEFAULT NULL COMMENT 'auditor',
  `audit_date` DATETIME DEFAULT NULL COMMENT 'audit_date',
  `audit_opinion` TEXT DEFAULT NULL COMMENT 'audit_opinion',
  `audit_status` VARCHAR(40) DEFAULT NULL COMMENT 'audit_status',
  `linked_plan_id` BIGINT DEFAULT NULL COMMENT 'linked_plan_id',
  `workflow_status` TEXT DEFAULT NULL COMMENT 'workflow_status',
  `purchaser_accepted` TEXT DEFAULT NULL COMMENT 'purchaser_accepted',
  `purchaser_accepted_at` DATETIME DEFAULT NULL COMMENT 'purchaser_accepted_at',
  `purchaser_opinion` TEXT DEFAULT NULL COMMENT 'purchaser_opinion',
  `quality_reviewed` TEXT DEFAULT NULL COMMENT 'quality_reviewed',
  `quality_reviewed_at` DATETIME DEFAULT NULL COMMENT 'quality_reviewed_at',
  `quality_review_opinion` TEXT DEFAULT NULL COMMENT 'quality_review_opinion',
  `warehouse_confirmed` TEXT DEFAULT NULL COMMENT 'warehouse_confirmed',
  `warehouse_confirmed_at` DATETIME DEFAULT NULL COMMENT 'warehouse_confirmed_at',
  `warehouse_opinion` TEXT DEFAULT NULL COMMENT 'warehouse_opinion',
  `quality_approved` TEXT DEFAULT NULL COMMENT 'quality_approved',
  `quality_approved_at` DATETIME DEFAULT NULL COMMENT 'quality_approved_at',
  `quality_approval_opinion` TEXT DEFAULT NULL COMMENT 'quality_approval_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_proc_equipment_status` (`status`),
  KEY `idx_proc_equipment_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='proc_equipment';

-- 原表: product_acceptance
DROP TABLE IF EXISTS `product_acceptance`;
CREATE TABLE `product_acceptance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `product_name` VARCHAR(400) DEFAULT NULL COMMENT 'product_name',
  `product_udi` VARCHAR(100) DEFAULT NULL COMMENT 'product_udi',
  `batch_no` VARCHAR(100) DEFAULT NULL COMMENT 'batch_no',
  `manufacturer` VARCHAR(200) DEFAULT NULL COMMENT 'manufacturer',
  `prod_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'prod_license_no',
  `reg_cert_no` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert_no',
  `supplier` VARCHAR(200) DEFAULT NULL COMMENT 'supplier',
  `quantity` BIGINT DEFAULT NULL COMMENT 'quantity',
  `accept_date` DATETIME DEFAULT NULL COMMENT 'accept_date',
  `accept_person` VARCHAR(100) DEFAULT NULL COMMENT 'accept_person',
  `check_type` VARCHAR(60) DEFAULT NULL COMMENT 'check_type',
  `appearance_check` VARCHAR(40) DEFAULT NULL COMMENT 'appearance_check',
  `quantity_check` VARCHAR(40) DEFAULT NULL COMMENT 'quantity_check',
  `quality_check` VARCHAR(40) DEFAULT NULL COMMENT 'quality_check',
  `overall_result` VARCHAR(40) DEFAULT NULL COMMENT 'overall_result',
  `production_date` DATETIME DEFAULT NULL COMMENT 'production_date',
  `expiry_date` DATETIME DEFAULT NULL COMMENT 'expiry_date',
  `remark` TEXT DEFAULT NULL COMMENT 'remark',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `linked_proc_id` BIGINT DEFAULT NULL COMMENT 'linked_proc_id',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `appearance_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'appearance_reviewer',
  `appearance_date` DATETIME DEFAULT NULL COMMENT 'appearance_date',
  `appearance_remark` TEXT DEFAULT NULL COMMENT 'appearance_remark',
  `quantity_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'quantity_reviewer',
  `quantity_date` DATETIME DEFAULT NULL COMMENT 'quantity_date',
  `quantity_remark` TEXT DEFAULT NULL COMMENT 'quantity_remark',
  `quality_reviewer` VARCHAR(100) DEFAULT NULL COMMENT 'quality_reviewer',
  `quality_date` DATETIME DEFAULT NULL COMMENT 'quality_date',
  `quality_remark` TEXT DEFAULT NULL COMMENT 'quality_remark',
  `final_approver` VARCHAR(100) DEFAULT NULL COMMENT 'final_approver',
  `final_approval_date` DATETIME DEFAULT NULL COMMENT 'final_approval_date',
  `final_opinion` TEXT DEFAULT NULL COMMENT 'final_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_product_acceptance_batch_no` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='product_acceptance';

-- 原表: purchase_plan
DROP TABLE IF EXISTS `purchase_plan`;
CREATE TABLE `purchase_plan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `plan_no` VARCHAR(100) DEFAULT NULL COMMENT 'plan_no',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `spec_model` VARCHAR(500) DEFAULT NULL COMMENT 'spec_model',
  `qty` BIGINT DEFAULT NULL COMMENT 'qty',
  `budget` DOUBLE DEFAULT NULL COMMENT 'budget',
  `category` VARCHAR(40) DEFAULT NULL COMMENT 'category',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT 'customer_name',
  `factory_name` VARCHAR(200) DEFAULT NULL COMMENT 'factory_name',
  `prod_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'prod_license_no',
  `reg_cert_no` VARCHAR(200) DEFAULT NULL COMMENT 'reg_cert_no',
  `applicant` VARCHAR(100) DEFAULT NULL COMMENT 'applicant',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `date` VARCHAR(40) DEFAULT NULL COMMENT 'date',
  `workflow_status` TEXT DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` TEXT DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` TEXT DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_purchase_plan_name` (`name`),
  KEY `idx_purchase_plan_status` (`status`),
  KEY `idx_purchase_plan_plan_no` (`plan_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='purchase_plan';

-- 原表: recall_record
DROP TABLE IF EXISTS `recall_record`;
CREATE TABLE `recall_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `notify_no` VARCHAR(100) DEFAULT NULL COMMENT 'notify_no',
  `product` VARCHAR(400) DEFAULT NULL COMMENT 'product',
  `udi` VARCHAR(100) DEFAULT NULL COMMENT 'udi',
  `batch` VARCHAR(100) DEFAULT NULL COMMENT 'batch',
  `level` VARCHAR(40) DEFAULT NULL COMMENT 'level',
  `reason` TEXT DEFAULT NULL COMMENT 'reason',
  `source` VARCHAR(200) DEFAULT NULL COMMENT 'source',
  `total_qty` BIGINT DEFAULT NULL COMMENT 'total_qty',
  `recalled_qty` BIGINT DEFAULT NULL COMMENT 'recalled_qty',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `start_date` DATETIME DEFAULT NULL COMMENT 'start_date',
  `finish_date` DATETIME DEFAULT NULL COMMENT 'finish_date',
  `disposal_method` VARCHAR(400) DEFAULT NULL COMMENT 'disposal_method',
  `report_no` VARCHAR(100) DEFAULT NULL COMMENT 'report_no',
  `reporter` VARCHAR(100) DEFAULT NULL COMMENT 'reporter',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_recall_record_udi` (`udi`),
  KEY `idx_recall_record_batch` (`batch`),
  KEY `idx_recall_record_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='recall_record';

-- 原表: repair_order
DROP TABLE IF EXISTS `repair_order`;
CREATE TABLE `repair_order` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `desc` TEXT DEFAULT NULL COMMENT 'desc',
  `reporter` VARCHAR(100) DEFAULT NULL COMMENT 'reporter',
  `report_time` DATETIME DEFAULT NULL COMMENT 'report_time',
  `repairer` VARCHAR(100) DEFAULT NULL COMMENT 'repairer',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `cost` DOUBLE DEFAULT NULL COMMENT 'cost',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT 'customer_name',
  `dept_name` VARCHAR(200) DEFAULT NULL COMMENT 'dept_name',
  `serial_no` VARCHAR(200) DEFAULT NULL COMMENT 'serial_no',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_repair_order_status` (`status`),
  KEY `idx_repair_order_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='repair_order';

-- 原表: roles
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` VARCHAR(100) DEFAULT NULL COMMENT 'code',
  `name` VARCHAR(100) DEFAULT NULL COMMENT 'name',
  `description` TEXT DEFAULT NULL COMMENT 'description',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='roles';

-- 原表: standard_check
DROP TABLE IF EXISTS `standard_check`;
CREATE TABLE `standard_check` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equip_name` VARCHAR(400) DEFAULT NULL COMMENT 'equip_name',
  `equip_udi` VARCHAR(100) DEFAULT NULL COMMENT 'equip_udi',
  `std_no` VARCHAR(100) DEFAULT NULL COMMENT 'std_no',
  `result` VARCHAR(40) DEFAULT NULL COMMENT 'result',
  `check_date` DATETIME DEFAULT NULL COMMENT 'check_date',
  `std_name` VARCHAR(500) DEFAULT NULL COMMENT 'std_name',
  `checker` VARCHAR(100) DEFAULT NULL COMMENT 'checker',
  `check_method` VARCHAR(400) DEFAULT NULL COMMENT 'check_method',
  `conclusion` TEXT DEFAULT NULL COMMENT 'conclusion',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `rectify_measures` TEXT DEFAULT NULL COMMENT 'rectify_measures',
  `rectify_deadline` VARCHAR(40) DEFAULT NULL COMMENT 'rectify_deadline',
  `remark` TEXT DEFAULT NULL COMMENT 'remark',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_standard_check_equip_udi` (`equip_udi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='standard_check';

-- 原表: supplier
DROP TABLE IF EXISTS `supplier`;
CREATE TABLE `supplier` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `code` VARCHAR(100) DEFAULT NULL COMMENT 'code',
  `type` VARCHAR(100) DEFAULT NULL COMMENT 'type',
  `med_biz_license_no` VARCHAR(200) DEFAULT NULL COMMENT 'med_biz_license_no',
  `license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'license_expire',
  `gsp_cert` VARCHAR(200) DEFAULT NULL COMMENT 'gsp_cert',
  `scope` VARCHAR(400) DEFAULT NULL COMMENT 'scope',
  `reg_capital` VARCHAR(100) DEFAULT NULL COMMENT 'reg_capital',
  `address` VARCHAR(500) DEFAULT NULL COMMENT 'address',
  `legal_person` VARCHAR(100) DEFAULT NULL COMMENT 'legal_person',
  `contact` VARCHAR(100) DEFAULT NULL COMMENT 'contact',
  `phone` VARCHAR(60) DEFAULT NULL COMMENT 'phone',
  `email` VARCHAR(200) DEFAULT NULL COMMENT 'email',
  `bank_info` VARCHAR(400) DEFAULT NULL COMMENT 'bank_info',
  `rating` VARCHAR(40) DEFAULT NULL COMMENT 'rating',
  `coop_since` VARCHAR(20) DEFAULT NULL COMMENT 'coop_since',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `review_status` VARCHAR(40) DEFAULT NULL COMMENT 'review_status',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `class2_filing_no` VARCHAR(200) DEFAULT NULL COMMENT 'class2_filing_no',
  `auth_period` VARCHAR(100) DEFAULT NULL COMMENT 'auth_period',
  `cert_update_status` VARCHAR(40) DEFAULT NULL COMMENT 'cert_update_status',
  `cert_update_id` BIGINT DEFAULT NULL COMMENT 'cert_update_id',
  `cert_update_at` DATETIME DEFAULT NULL COMMENT 'cert_update_at',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`),
  KEY `idx_supplier_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='supplier';

-- 原表: supplier_doc
DROP TABLE IF EXISTS `supplier_doc`;
CREATE TABLE `supplier_doc` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `supplier_id` BIGINT DEFAULT NULL COMMENT 'supplier_id',
  `doc_type` VARCHAR(100) DEFAULT NULL COMMENT 'doc_type',
  `title` VARCHAR(400) DEFAULT NULL COMMENT 'title',
  `no` VARCHAR(200) DEFAULT NULL COMMENT 'no',
  `issue_date` DATETIME DEFAULT NULL COMMENT 'issue_date',
  `expire_date` DATETIME DEFAULT NULL COMMENT 'expire_date',
  `file_type` VARCHAR(40) DEFAULT NULL COMMENT 'file_type',
  `review_by` VARCHAR(100) DEFAULT NULL COMMENT 'review_by',
  `review_date` DATETIME DEFAULT NULL COMMENT 'review_date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_supplier_doc_status` (`status`),
  KEY `idx_supplier_doc_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='supplier_doc';

-- 原表: system_profile
DROP TABLE IF EXISTS `system_profile`;
CREATE TABLE `system_profile` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(400) DEFAULT NULL COMMENT 'name',
  `credit_code` VARCHAR(100) DEFAULT NULL COMMENT 'credit_code',
  `enterprise_type` VARCHAR(100) DEFAULT NULL COMMENT 'enterprise_type',
  `business_license` VARCHAR(200) DEFAULT NULL COMMENT 'business_license',
  `business_license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'business_license_expire',
  `med_device_license` VARCHAR(200) DEFAULT NULL COMMENT 'med_device_license',
  `med_device_license_expire` VARCHAR(40) DEFAULT NULL COMMENT 'med_device_license_expire',
  `record_cert` VARCHAR(200) DEFAULT NULL COMMENT 'record_cert',
  `record_cert_expire` VARCHAR(40) DEFAULT NULL COMMENT 'record_cert_expire',
  `legal_person` VARCHAR(100) DEFAULT NULL COMMENT 'legal_person',
  `enterprise_head` VARCHAR(100) DEFAULT NULL COMMENT 'enterprise_head',
  `quality_manager` VARCHAR(100) DEFAULT NULL COMMENT 'quality_manager',
  `quality_dept` VARCHAR(200) DEFAULT NULL COMMENT 'quality_dept',
  `reg_address` VARCHAR(500) DEFAULT NULL COMMENT 'reg_address',
  `warehouse_address` VARCHAR(500) DEFAULT NULL COMMENT 'warehouse_address',
  `business_area` VARCHAR(100) DEFAULT NULL COMMENT 'business_area',
  `warehouse_area` VARCHAR(100) DEFAULT NULL COMMENT 'warehouse_area',
  `scope` TEXT DEFAULT NULL COMMENT 'scope',
  `phone` VARCHAR(60) DEFAULT NULL COMMENT 'phone',
  `email` VARCHAR(200) DEFAULT NULL COMMENT 'email',
  `bank_name` VARCHAR(200) DEFAULT NULL COMMENT 'bank_name',
  `bank_account` VARCHAR(100) DEFAULT NULL COMMENT 'bank_account',
  `establish_date` DATETIME DEFAULT NULL COMMENT 'establish_date',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `remark` TEXT DEFAULT NULL COMMENT 'remark',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `updated_at` DATETIME DEFAULT NULL COMMENT 'updated_at',
  `workflow_status` VARCHAR(40) DEFAULT NULL COMMENT 'workflow_status',
  `entered_by` VARCHAR(100) DEFAULT NULL COMMENT 'entered_by',
  `entered_at` DATETIME DEFAULT NULL COMMENT 'entered_at',
  `reviewed_by` VARCHAR(100) DEFAULT NULL COMMENT 'reviewed_by',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT 'reviewed_at',
  `review_opinion` TEXT DEFAULT NULL COMMENT 'review_opinion',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_system_profile_name` (`name`),
  KEY `idx_system_profile_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='system_profile';

-- 原表: temp_humidity_log
DROP TABLE IF EXISTS `temp_humidity_log`;
CREATE TABLE `temp_humidity_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `hour` VARCHAR(20) DEFAULT NULL COMMENT 'hour',
  `temp` DOUBLE DEFAULT NULL COMMENT 'temp',
  `humid` DOUBLE DEFAULT NULL COMMENT 'humid',
  `record_date` DATETIME DEFAULT NULL COMMENT 'record_date',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='temp_humidity_log';

-- 原表: training_plan
DROP TABLE IF EXISTS `training_plan`;
CREATE TABLE `training_plan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `plan_no` VARCHAR(60) DEFAULT NULL COMMENT 'plan_no',
  `title` VARCHAR(400) DEFAULT NULL COMMENT 'title',
  `period_type` VARCHAR(20) DEFAULT NULL COMMENT 'period_type',
  `period_label` VARCHAR(100) DEFAULT NULL COMMENT 'period_label',
  `year` VARCHAR(20) DEFAULT NULL COMMENT 'year',
  `content` TEXT DEFAULT NULL COMMENT 'content',
  `target_audience` VARCHAR(500) DEFAULT NULL COMMENT 'target_audience',
  `trainer` VARCHAR(100) DEFAULT NULL COMMENT 'trainer',
  `location` VARCHAR(400) DEFAULT NULL COMMENT 'location',
  `planned_date` DATETIME DEFAULT NULL COMMENT 'planned_date',
  `planned_hours` DOUBLE DEFAULT NULL COMMENT 'planned_hours',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'created_by',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'approved_by',
  `approved_at` DATETIME DEFAULT NULL COMMENT 'approved_at',
  `approval_opinion` TEXT DEFAULT NULL COMMENT 'approval_opinion',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_training_plan_status` (`status`),
  KEY `idx_training_plan_plan_no` (`plan_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='training_plan';

-- 原表: training_record
DROP TABLE IF EXISTS `training_record`;
CREATE TABLE `training_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `record_no` VARCHAR(60) DEFAULT NULL COMMENT 'record_no',
  `plan_id` BIGINT DEFAULT NULL COMMENT 'plan_id',
  `plan_no` VARCHAR(60) DEFAULT NULL COMMENT 'plan_no',
  `title` VARCHAR(400) DEFAULT NULL COMMENT 'title',
  `training_type` VARCHAR(60) DEFAULT NULL COMMENT 'training_type',
  `content` TEXT DEFAULT NULL COMMENT 'content',
  `training_date` DATETIME DEFAULT NULL COMMENT 'training_date',
  `location` VARCHAR(400) DEFAULT NULL COMMENT 'location',
  `trainer` VARCHAR(100) DEFAULT NULL COMMENT 'trainer',
  `duration_hours` DOUBLE DEFAULT NULL COMMENT 'duration_hours',
  `participants` TEXT DEFAULT NULL COMMENT 'participants',
  `participant_count` BIGINT DEFAULT NULL COMMENT 'participant_count',
  `assessment` VARCHAR(40) DEFAULT NULL COMMENT 'assessment',
  `summary` TEXT DEFAULT NULL COMMENT 'summary',
  `pdf_filename` VARCHAR(500) DEFAULT NULL COMMENT 'pdf_filename',
  `pdf_path` VARCHAR(500) DEFAULT NULL COMMENT 'pdf_path',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'created_by',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_training_record_plan_no` (`plan_no`),
  KEY `idx_training_record_record_no` (`record_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='training_record';

-- 原表: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` VARCHAR(100) DEFAULT NULL COMMENT 'username',
  `password_hash` VARCHAR(500) DEFAULT NULL COMMENT 'password_hash',
  `name` VARCHAR(100) DEFAULT NULL COMMENT 'name',
  `dept` VARCHAR(200) DEFAULT NULL COMMENT 'dept',
  `role_code` VARCHAR(100) DEFAULT NULL COMMENT 'role_code',
  `phone` VARCHAR(40) DEFAULT NULL COMMENT 'phone',
  `email` VARCHAR(200) DEFAULT NULL COMMENT 'email',
  `status` VARCHAR(40) DEFAULT NULL COMMENT 'status',
  `created_at` DATETIME DEFAULT NULL COMMENT 'created_at',
  `permission_overrides` TEXT DEFAULT NULL COMMENT 'permission_overrides',
  `created_by` VARCHAR(50) DEFAULT '' COMMENT '创建人',
  `updated_by` VARCHAR(50) DEFAULT '' COMMENT '更新人',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_users_name` (`name`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='users';
