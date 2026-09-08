/**
 * 002 - 40 张业务表 DDL + 老系统存量数据种子
 *
 * DDL 与种子由 server/scripts/mysql2sqlite.py 从老项目
 * db/migration/V1__init_schema.sql + V2__migrate_data.sql 自动转换生成
 * （MySQL -> SQLite 方言；users/roles 由 001 创建，此处跳过）
 *
 * 字段与老系统 100% 对齐：TEXT 存日期、REAL 存金额、逻辑删除 deleted、
 * 审计字段 created_by/updated_by，切换 MySQL 时按 README 方言对照重写即可。
 */
const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, 'sql');

function readSql(file) {
  return fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
}

module.exports = {
  id: '002_business_tables',

  up(db) {
    db.exec(readSql('002_business_tables.sql'));
  },

  seed(db) {
    // 幂等保护：已有业务数据（如 equip_ledger 非空）则跳过整份种子
    const hasData = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='equip_ledger'")
      .get();
    if (!hasData) return;
    const count = db.prepare('SELECT COUNT(*) AS c FROM equip_ledger').get().c;
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log('  [seed] 业务数据已存在，跳过 002 存量种子');
      return;
    }
    db.exec(readSql('002_seed_data.sql'));
  },
};
