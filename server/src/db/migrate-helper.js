/**
 * migrate.js 的辅助模块：导出 up/seed 给 ensureSchema 用
 * 不直接 require ./migrate.js 避免循环依赖
 */
const migrations = require('./migrations');
const db = require('./index');
const logger = require('../utils/logger');

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function isApplied(id) {
  return !!db.prepare('SELECT 1 FROM _migrations WHERE id = ?').get(id);
}

function markApplied(id) {
  db.prepare('INSERT INTO _migrations (id) VALUES (?)').run(id);
}

function up() {
  ensureMigrationsTable();
  for (const m of migrations) {
    if (isApplied(m.id)) continue;
    try {
      const trx = db.transaction(() => {
        if (typeof m.up === 'function') m.up(db);
        markApplied(m.id);
      });
      trx();
      logger.info(`✓ [startup] ${m.id}`);
    } catch (err) {
      logger.warn(`[startup] ${m.id} 失败: ${err.message}`);
    }
  }
}

function seed() {
  if (process.env.AUTO_SEED === '0') return;
  ensureMigrationsTable();
  for (const m of migrations) {
    if (!isApplied(m.id)) continue;
    try {
      const trx = db.transaction(() => {
        if (typeof m.seed === 'function') m.seed(db);
      });
      trx();
    } catch (err) {
      logger.warn(`[startup seed] ${m.id} 失败: ${err.message}`);
    }
  }
}

module.exports = { up, seed };