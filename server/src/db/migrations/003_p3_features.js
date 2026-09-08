/**
 * 003 - P3 业务增强
 * 1. outbound_record 补列：供应商/经销商、打印留痕、库存联动（预占/来源追溯）
 *    —— 对齐数据包 OutboundRecord 模型（六级审批 + 库存预占 + 自动记账所需字段）
 * 2. 新表 acceptance_doc：验收资料 PDF 留档（上传/下载/删除，随采购单/出库单关联）
 */

/** 幂等加列：列已存在则跳过 */
function addColumns(db, table, colDefs) {
  const existing = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name));
  for (const [name, ddl] of Object.entries(colDefs)) {
    if (existing.has(name)) continue;
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${ddl};`);
  }
}

module.exports = {
  id: '003_p3_features',

  up(db) {
    // ---- 1. outbound_record 补列（幂等） ----
    addColumns(db, 'outbound_record', {
      supplier:     "TEXT    DEFAULT ''",
      dealer:       "TEXT    DEFAULT ''",
      print_count:  'INTEGER DEFAULT 0',
      last_print_at: "TEXT   DEFAULT ''",
      last_print_by: "TEXT   DEFAULT ''",
      inv_id:       'INTEGER DEFAULT 0',
      reserved_qty: 'INTEGER DEFAULT 0',
      stock_in_id:  'INTEGER DEFAULT 0',
    });

    // ---- 2. acceptance_doc 表 ----
    db.exec(`
      CREATE TABLE IF NOT EXISTS acceptance_doc (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        biz_type     TEXT    DEFAULT '',
        biz_id       INTEGER DEFAULT 0,
        order_no     TEXT    DEFAULT '',
        doc_type     TEXT    DEFAULT '验收资料',
        title        TEXT    DEFAULT '',
        file_name    TEXT    DEFAULT '',
        file_path    TEXT    DEFAULT '',
        file_size    INTEGER DEFAULT 0,
        remark       TEXT    DEFAULT '',
        uploaded_by  TEXT    DEFAULT '',
        uploaded_at  TEXT    DEFAULT '',
        created_by   TEXT    DEFAULT '',
        created_at   TEXT    DEFAULT (datetime('now','localtime')),
        updated_by   TEXT    DEFAULT '',
        updated_at   TEXT    DEFAULT (datetime('now','localtime')),
        deleted      INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_acceptance_doc_biz ON acceptance_doc (biz_type, biz_id);
    `);
  },

  down(db) {
    db.exec('DROP TABLE IF EXISTS acceptance_doc;');
  },
};
