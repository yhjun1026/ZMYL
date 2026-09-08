/**
 * 迁移列表（按顺序执行）
 * 每个迁移导出 { id, up(db), seed(db), down?(db) }
 */
module.exports = [
  require('./001_init_users_roles'),
  require('./002_business_tables'),
  require('./003_p3_features'),
];