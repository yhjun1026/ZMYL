/**
 * 数据库统一入口 —— async 门面（DB 可替换架构）
 *
 * ┌─ 使用约定 ─────────────────────────────────────────────────────────┐
 * │ 业务代码（controllers / middleware / utils）一律使用 async 门面：   │
 * │   const row = await db.get(sql, params)                            │
 * │   const rows = await db.all(sql, params)                           │
 * │   const info = await db.run(sql, params)  // {changes, insertId}   │
 * │   await db.exec(sql)                                               │
 * │   const result = await db.transaction((tx) => { ... })             │
 * │                                                                     │
 * │ 迁移基建（migrate.js / migrations/*.js / ensureSchema.js）          │
 * │ 使用 db.raw（better-sqlite3 原始句柄，同步）：                       │
 * │ 切换数据库时 DDL 本来就要按方言重写，所以基建层允许直连 raw。        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 切换 MySQL 时的改动面（预计 1~2 天）：
 *   1. 本文件改为 mysql2/promise + 连接池实现（保持同名 API）
 *   2. migrations/*.js 的 DDL 按方言重写（AUTOINCREMENT → AUTO_INCREMENT、
 *      datetime('now') → NOW() 等）
 *   3. 存量数据用 sqlite3-to-mysql / 手写 ETL 迁移
 *   4. controllers / middleware / utils 层 0 行改动
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保 data 目录存在
const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.db.path);

// 性能 + 安全配置
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// audit_log 是审计日志表，启动时保证存在
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id TEXT,
    target TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`);

// ---------------------------------------------------------------------------
// 同步核心（仅供事务体内部使用；SQLite 的事务必须是同步函数）
// ---------------------------------------------------------------------------
const core = {
  get: (sql, params = []) => db.prepare(sql).get(...params),
  all: (sql, params = []) => db.prepare(sql).all(...params),
  run: (sql, params = []) => {
    const info = db.prepare(sql).run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  },
  exec: (sql) => db.exec(sql),
};

// ---------------------------------------------------------------------------
// async 门面（业务代码唯一入口）
// ---------------------------------------------------------------------------
const api = {
  /** 数据库方言标识：'sqlite' | 'mysql'（业务代码如需方言分支，读这个） */
  dialect: 'sqlite',

  /** better-sqlite3 原始句柄 —— 仅迁移基建可用，业务代码禁止触碰 */
  raw: db,

  /** 查询单行，无结果返回 undefined */
  async get(sql, params = []) {
    return db.prepare(sql).get(...params);
  },

  /** 查询多行 */
  async all(sql, params = []) {
    return db.prepare(sql).all(...params);
  },

  /** 执行写语句，返回 { changes, insertId }（insertId 兼容两种驱动命名） */
  async run(sql, params = []) {
    const info = db.prepare(sql).run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  },

  /** 执行多语句脚本（DDL 等） */
  async exec(sql) {
    return db.exec(sql);
  },

  /**
   * 事务：fn 接收同步核心 tx（tx.get / tx.all / tx.run / tx.exec）
   * 注意：SQLite 下 fn 必须是同步函数；切 MySQL 时改为连接级事务 + async fn
   */
  transaction(fn) {
    const trx = db.transaction(() => fn(core));
    return Promise.resolve(trx());
  },

  /** 关闭连接（优雅关闭时用） */
  async close() {
    return db.close();
  },
};

module.exports = api;
