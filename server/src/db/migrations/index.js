/**
 * 迁移列表（按顺序执行）
 * 每个迁移导出 { id, up(db), seed(db), down?(db) }
 */
module.exports = [
  require('./migrations/001_init_users_roles'),
];