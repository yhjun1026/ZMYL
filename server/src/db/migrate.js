/**
 * 迁移 + 种子命令
 * 命令: up | seed | reset | status
 */
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { raw: db } = require('./index');
const logger = require('../utils/logger');

const migrationsDir = path.join(__dirname, 'migrations');
const migrations = require('./migrations'); // 数组形式

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

function unmark(id) {
  db.prepare('DELETE FROM _migrations WHERE id = ?').run(id);
}

function up() {
  ensureMigrationsTable();
  let count = 0;
  for (const m of migrations) {
    if (isApplied(m.id)) {
      logger.info(`✓ [skip] ${m.id}`);
      continue;
    }
    try {
      const trx = db.transaction(() => {
        if (typeof m.up === 'function') m.up(db);
        markApplied(m.id);
      });
      trx();
      logger.info(`✓ [up]   ${m.id}`);
      count++;
    } catch (err) {
      logger.error(`✗ [up]   ${m.id}: ${err.message}`);
      throw err;
    }
  }
  if (count === 0) logger.info('已是最新');
  else logger.info(`迁移完成，应用 ${count} 个`);
}

function seed() {
  ensureMigrationsTable();
  let count = 0;
  for (const m of migrations) {
    if (!isApplied(m.id)) continue; // 未跑过的迁移不 seed
    try {
      const trx = db.transaction(() => {
        if (typeof m.seed === 'function') {
          const result = m.seed(db);
          if (result) count++;
        }
      });
      trx();
    } catch (err) {
      logger.error(`✗ [seed] ${m.id}: ${err.message}`);
    }
  }
  logger.info(`Seed 完成（${count} 条种子写入）`);
}

function status() {
  ensureMigrationsTable();
  const applied = db.prepare('SELECT id, applied_at FROM _migrations ORDER BY id').all();
  const appliedMap = new Map(applied.map(r => [r.id, r.applied_at]));
  console.log('\n=== Migration Status ===');
  for (const m of migrations) {
    const at = appliedMap.get(m.id);
    console.log(`${at ? '✓' : '✗'} ${m.id.padEnd(40)} ${at || '(pending)'}`);
  }
  console.log(`Total: ${migrations.length}, Applied: ${applied.length}\n`);
}

function reset() {
  // 危险操作：删除所有业务表 + 重建
  if (!config.isProd) {
    console.warn('\n⚠️  [WARN] 非生产环境执行 reset()\n');
  } else {
    console.error('✗ 生产环境禁止 reset！请手动 DROP DATABASE');
    process.exit(1);
  }

  // 所有业务表白名单（不含 _migrations / audit_log）
  const ALL_TABLES = [
    'users', 'roles',
  ];

  for (const t of ALL_TABLES) {
    db.exec(`DROP TABLE IF EXISTS ${t};`);
  }
  db.exec('DELETE FROM _migrations;');
  logger.info('✓ 所有业务表已 DROP');
  up();
  seed();
}

const cmd = process.argv[2];
switch (cmd) {
  case 'up': up(); break;
  case 'seed': seed(); break;
  case 'reset': reset(); break;
  case 'status': status(); break;
  default:
    console.log('Usage: node src/db/migrate.js [up|seed|reset|status]');
    process.exit(1);
}

if (cmd !== 'reset') {
  db.close();
}