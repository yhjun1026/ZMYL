/**
 * 004 - P4 高级特性
 * 对齐数据包 models.py：
 * 1. 可配置审批流引擎：approval_flow / approval_flow_step / approval_flow_log
 * 2. 冷链管理（全链条 + IoT）：cold_chain_device / cold_chain_record / cold_chain_alarm / cold_chain_ledger
 * 3. 物流进度追踪：logistics_carrier / logistics_order / logistics_node
 * 4. 自动备份：backup_record（备份文件清单 + 手动/自动备份留痕）
 */

module.exports = {
  id: '004_p4_features',

  up(db) {
    db.exec(`
      -- ==================== 可配置审批流引擎 ====================
      CREATE TABLE IF NOT EXISTS approval_flow (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_code        TEXT    NOT NULL,
        flow_name        TEXT    NOT NULL,
        biz_module       TEXT    DEFAULT '',
        biz_module_name  TEXT    DEFAULT '',
        version          INTEGER DEFAULT 1,
        is_current       INTEGER DEFAULT 0,
        status           TEXT    DEFAULT 'draft',  -- draft/pending/active/rejected/disabled/archived
        description      TEXT    DEFAULT '',
        effective_at     TEXT    DEFAULT '',
        submitted_by     TEXT    DEFAULT '',
        submitted_by_id  INTEGER DEFAULT 0,
        submitted_at     TEXT    DEFAULT '',
        approved_by      TEXT    DEFAULT '',
        approved_by_id   INTEGER DEFAULT 0,
        approved_at      TEXT    DEFAULT '',
        approve_opinion  TEXT    DEFAULT '',
        created_by       TEXT    DEFAULT '',
        created_by_id    INTEGER DEFAULT 0,
        created_at       TEXT    DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    DEFAULT (datetime('now','localtime')),
        deleted          INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_flow_module ON approval_flow (biz_module, status, is_current);
      CREATE INDEX IF NOT EXISTS idx_flow_code ON approval_flow (flow_code);

      CREATE TABLE IF NOT EXISTS approval_flow_step (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id            INTEGER NOT NULL,
        step_no            INTEGER DEFAULT 1,
        step_name          TEXT    NOT NULL,
        step_code          TEXT    DEFAULT '',
        approver_role      TEXT    DEFAULT '',
        approver_role_name TEXT    DEFAULT '',
        approver_user_ids  TEXT    DEFAULT '',   -- JSON 数组字符串
        is_required        INTEGER DEFAULT 1,
        can_reject         INTEGER DEFAULT 1,
        reject_action      TEXT    DEFAULT 'to_prev',  -- to_prev/to_start/terminate
        allow_transfer     INTEGER DEFAULT 0,
        timeout_days       INTEGER DEFAULT 0,
        auto_approve_same  INTEGER DEFAULT 0,
        cc_roles           TEXT    DEFAULT '',   -- JSON 数组字符串
        description        TEXT    DEFAULT '',
        created_at         TEXT    DEFAULT (datetime('now','localtime')),
        deleted            INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_flow_step_flow ON approval_flow_step (flow_id, step_no);

      CREATE TABLE IF NOT EXISTS approval_flow_log (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id       INTEGER NOT NULL,
        flow_code     TEXT    DEFAULT '',
        flow_name     TEXT    DEFAULT '',
        version       INTEGER DEFAULT 0,
        action        TEXT    DEFAULT '',
        from_status   TEXT    DEFAULT '',
        to_status     TEXT    DEFAULT '',
        opinion       TEXT    DEFAULT '',
        operator_id   INTEGER DEFAULT 0,
        operator_name TEXT    DEFAULT '',
        operator_role TEXT    DEFAULT '',
        created_at    TEXT    DEFAULT (datetime('now','localtime')),
        deleted       INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_flow_log_flow ON approval_flow_log (flow_id);

      -- ==================== 冷链管理（全链条 + IoT） ====================
      CREATE TABLE IF NOT EXISTS cold_chain_device (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        device_code      TEXT    NOT NULL,
        device_name      TEXT    NOT NULL,
        device_type      TEXT    DEFAULT '冷藏车',
        node_type        TEXT    DEFAULT 'own_warehouse',  -- factory_warehouse/transport/own_warehouse/customer
        temp_min         REAL    DEFAULT 2.0,
        temp_max         REAL    DEFAULT 8.0,
        humid_min        REAL    DEFAULT 35.0,
        humid_max        REAL    DEFAULT 75.0,
        location         TEXT    DEFAULT '',
        belong_supplier  TEXT    DEFAULT '',
        vehicle_no       TEXT    DEFAULT '',
        status           TEXT    DEFAULT 'normal',  -- normal/repairing/disabled
        calibration_no   TEXT    DEFAULT '',
        calibration_date TEXT    DEFAULT '',
        calibration_due  TEXT    DEFAULT '',
        api_key          TEXT    DEFAULT '',
        report_interval  INTEGER DEFAULT 30,
        last_report_at   TEXT    DEFAULT '',
        offline_alarm    INTEGER DEFAULT 1,
        remark           TEXT    DEFAULT '',
        created_by       TEXT    DEFAULT '',
        created_at       TEXT    DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    DEFAULT (datetime('now','localtime')),
        deleted          INTEGER DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_device_code ON cold_chain_device (device_code);
      CREATE INDEX IF NOT EXISTS idx_cc_device_key ON cold_chain_device (api_key);

      CREATE TABLE IF NOT EXISTS cold_chain_record (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id    INTEGER DEFAULT 0,
        device_code  TEXT    DEFAULT '',
        device_name  TEXT    DEFAULT '',
        node_type    TEXT    DEFAULT 'own_warehouse',
        temp         REAL    NOT NULL,
        humid        REAL    DEFAULT 0,
        record_time  TEXT    DEFAULT '',
        logistics_id INTEGER DEFAULT 0,
        related_type TEXT    DEFAULT '',
        related_id   INTEGER DEFAULT 0,
        batch        TEXT    DEFAULT '',
        udi          TEXT    DEFAULT '',
        product_name TEXT    DEFAULT '',
        temp_min     REAL    DEFAULT 2.0,
        temp_max     REAL    DEFAULT 8.0,
        is_abnormal  INTEGER DEFAULT 0,
        exceed_type  TEXT    DEFAULT '',
        source       TEXT    DEFAULT 'manual',  -- manual/iot/import
        operator     TEXT    DEFAULT '',
        location     TEXT    DEFAULT '',
        remark       TEXT    DEFAULT '',
        created_at   TEXT    DEFAULT (datetime('now','localtime')),
        deleted      INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_cc_record_device ON cold_chain_record (device_id, record_time);
      CREATE INDEX IF NOT EXISTS idx_cc_record_batch ON cold_chain_record (batch, udi, logistics_id);

      CREATE TABLE IF NOT EXISTS cold_chain_alarm (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        alarm_no         TEXT    NOT NULL,
        record_id        INTEGER DEFAULT 0,
        device_id        INTEGER DEFAULT 0,
        device_code      TEXT    DEFAULT '',
        device_name      TEXT    DEFAULT '',
        node_type        TEXT    DEFAULT '',
        alarm_type       TEXT    DEFAULT '',   -- temp_high/temp_low/humid_high/humid_low/device_offline/data_interrupt
        alarm_level      TEXT    DEFAULT 'warning',  -- warning/critical
        temp             REAL    DEFAULT 0,
        humid            REAL    DEFAULT 0,
        temp_min         REAL    DEFAULT 0,
        temp_max         REAL    DEFAULT 0,
        exceed_value     REAL    DEFAULT 0,
        duration_minutes INTEGER DEFAULT 0,
        status           TEXT    DEFAULT 'pending',  -- pending/processing/resolved/ignored
        triggered_at     TEXT    DEFAULT '',
        handler          TEXT    DEFAULT '',
        handler_id       INTEGER DEFAULT 0,
        handled_at       TEXT    DEFAULT '',
        handle_action    TEXT    DEFAULT '',
        handle_result    TEXT    DEFAULT '',
        logistics_id     INTEGER DEFAULT 0,
        batch            TEXT    DEFAULT '',
        udi              TEXT    DEFAULT '',
        product_name     TEXT    DEFAULT '',
        remark           TEXT    DEFAULT '',
        created_at       TEXT    DEFAULT (datetime('now','localtime')),
        deleted          INTEGER DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_alarm_no ON cold_chain_alarm (alarm_no);
      CREATE INDEX IF NOT EXISTS idx_cc_alarm_status ON cold_chain_alarm (status, alarm_level);

      CREATE TABLE IF NOT EXISTS cold_chain_ledger (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        ledger_no        TEXT    NOT NULL,
        related_type     TEXT    DEFAULT '',
        related_id       INTEGER DEFAULT 0,
        order_no         TEXT    DEFAULT '',
        product_name     TEXT    DEFAULT '',
        spec             TEXT    DEFAULT '',
        batch            TEXT    DEFAULT '',
        udi              TEXT    DEFAULT '',
        quantity         INTEGER DEFAULT 0,
        factory_name     TEXT    DEFAULT '',
        supplier_name    TEXT    DEFAULT '',
        customer_name    TEXT    DEFAULT '',
        logistics_id     INTEGER DEFAULT 0,
        logistics_no     TEXT    DEFAULT '',
        covered_nodes    TEXT    DEFAULT '',   -- JSON 数组
        start_time       TEXT    DEFAULT '',
        end_time         TEXT    DEFAULT '',
        temp_max         REAL    DEFAULT 0,
        temp_min         REAL    DEFAULT 0,
        temp_avg         REAL    DEFAULT 0,
        humid_avg        REAL    DEFAULT 0,
        record_count     INTEGER DEFAULT 0,
        alarm_count      INTEGER DEFAULT 0,
        unresolved_alarm INTEGER DEFAULT 0,
        is_qualified     INTEGER DEFAULT 1,
        conclusion       TEXT    DEFAULT '',
        verified_by      TEXT    DEFAULT '',
        verified_at      TEXT    DEFAULT '',
        remark           TEXT    DEFAULT '',
        created_by       TEXT    DEFAULT '',
        created_at       TEXT    DEFAULT (datetime('now','localtime')),
        deleted          INTEGER DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_ledger_no ON cold_chain_ledger (ledger_no);

      -- ==================== 物流进度追踪 ====================
      CREATE TABLE IF NOT EXISTS logistics_carrier (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_code         TEXT    DEFAULT '',
        name                 TEXT    NOT NULL,
        contact              TEXT    DEFAULT '',
        phone                TEXT    DEFAULT '',
        license_no           TEXT    DEFAULT '',
        cold_chain_qualified INTEGER DEFAULT 0,
        qualification_expire TEXT    DEFAULT '',
        service_scope        TEXT    DEFAULT '',
        remark               TEXT    DEFAULT '',
        status               TEXT    DEFAULT 'active',
        created_at           TEXT    DEFAULT (datetime('now','localtime')),
        updated_at           TEXT    DEFAULT (datetime('now','localtime')),
        deleted              INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS logistics_order (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        logistics_no     TEXT    NOT NULL,
        related_type     TEXT    DEFAULT 'other',  -- procurement/outbound/other
        related_id       INTEGER DEFAULT 0,
        related_no       TEXT    DEFAULT '',
        carrier_id       INTEGER DEFAULT 0,
        carrier_name     TEXT    DEFAULT '',
        driver_name      TEXT    DEFAULT '',
        driver_phone     TEXT    DEFAULT '',
        vehicle_no       TEXT    DEFAULT '',
        transport_mode   TEXT    DEFAULT 'normal',  -- cold_chain/normal/air/railway/express
        is_cold_chain    INTEGER DEFAULT 0,
        origin           TEXT    DEFAULT '',
        destination      TEXT    DEFAULT '',
        product_name     TEXT    DEFAULT '',
        spec             TEXT    DEFAULT '',
        batch            TEXT    DEFAULT '',
        udi              TEXT    DEFAULT '',
        quantity         INTEGER DEFAULT 0,
        factory_name     TEXT    DEFAULT '',
        customer_name    TEXT    DEFAULT '',
        shipped_at       TEXT    DEFAULT '',
        expected_arrival TEXT    DEFAULT '',
        actual_arrival   TEXT    DEFAULT '',
        signed_at        TEXT    DEFAULT '',
        signed_by        TEXT    DEFAULT '',
        status           TEXT    DEFAULT 'pending',  -- pending/shipped/in_transit/arrived/signed/exception
        current_node     TEXT    DEFAULT '',
        progress         INTEGER DEFAULT 0,
        temp_max         REAL    DEFAULT 0,
        temp_min         REAL    DEFAULT 0,
        alarm_count      INTEGER DEFAULT 0,
        remark           TEXT    DEFAULT '',
        created_by       TEXT    DEFAULT '',
        created_at       TEXT    DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    DEFAULT (datetime('now','localtime')),
        deleted          INTEGER DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lo_no ON logistics_order (logistics_no);
      CREATE INDEX IF NOT EXISTS idx_lo_status ON logistics_order (status, is_cold_chain);

      CREATE TABLE IF NOT EXISTS logistics_node (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        logistics_id INTEGER NOT NULL,
        node_seq     INTEGER DEFAULT 1,
        node_code    TEXT    DEFAULT '',  -- received/loaded/shipped/transit/arrived/delivering/signed/exception
        node_name    TEXT    DEFAULT '',
        node_time    TEXT    DEFAULT '',
        location     TEXT    DEFAULT '',
        operator     TEXT    DEFAULT '',
        status       TEXT    DEFAULT 'done',  -- done/current/pending
        temp         REAL    DEFAULT 0,
        humid        REAL    DEFAULT 0,
        is_abnormal  INTEGER DEFAULT 0,
        remark       TEXT    DEFAULT '',
        created_at   TEXT    DEFAULT (datetime('now','localtime')),
        deleted      INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_ln_order ON logistics_node (logistics_id, node_seq);

      -- ==================== 自动备份 ====================
      CREATE TABLE IF NOT EXISTS backup_record (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name   TEXT    NOT NULL,
        file_path   TEXT    NOT NULL,
        file_size   INTEGER DEFAULT 0,
        type        TEXT    DEFAULT 'manual',  -- manual/auto
        status      TEXT    DEFAULT 'success', -- success/failed
        message     TEXT    DEFAULT '',
        created_by  TEXT    DEFAULT '',
        created_at  TEXT    DEFAULT (datetime('now','localtime')),
        deleted     INTEGER DEFAULT 0
      );
    `);
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS approval_flow;
      DROP TABLE IF EXISTS approval_flow_step;
      DROP TABLE IF EXISTS approval_flow_log;
      DROP TABLE IF EXISTS cold_chain_device;
      DROP TABLE IF EXISTS cold_chain_record;
      DROP TABLE IF EXISTS cold_chain_alarm;
      DROP TABLE IF EXISTS cold_chain_ledger;
      DROP TABLE IF EXISTS logistics_carrier;
      DROP TABLE IF EXISTS logistics_order;
      DROP TABLE IF EXISTS logistics_node;
      DROP TABLE IF EXISTS backup_record;
    `);
  },
};
