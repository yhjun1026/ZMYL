/**
 * 启动时自愈：跑全部迁移（幂等）+ seed
 */
const logger = require('../utils/logger');

function ensureSchema() {
  try {
    // require 时避免循环依赖：直接在 require chain 末尾调用
    const { up } = require('./migrate-helper');
    up();
  } catch (err) {
    logger.warn(`ensureSchema 警告: ${err.message}`);
  }
}

function ensureSeeds() {
  try {
    const { seed } = require('./migrate-helper');
    seed();
  } catch (err) {
    logger.warn(`ensureSeeds 警告: ${err.message}`);
  }
}

module.exports = { ensureSchema, ensureSeeds };