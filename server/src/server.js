/**
 * 进程入口
 * 1. 自愈：跑全部迁移（幂等）
 * 2. 装配 app
 * 3. 自愈：seed
 * 4. 启动监听
 * 5. 注册优雅关闭
 */

const config = require('./config');
const logger = require('./utils/logger');

// 第一步：建表自愈（不依赖 app 装配）
const { ensureSchema, ensureSeeds } = require('./db/ensureSchema');
ensureSchema();

// 第二步：装配 app（路由 require 时依赖已存在的表）
const app = require('./app');

// 第三步：seed（路由加载后部分表才被 require；幂等）
ensureSeeds();

// 第四步：监听
const server = app.listen(config.port, () => {
  logger.info(`✓ ZMYL server 启动  http://localhost:${config.port}  env=${config.env}`);
});

// 第五步：优雅关闭
function shutdown(signal) {
  logger.info(`收到 ${signal}，准备关闭...`);
  server.close(() => {
    const db = require('./db');
    db.close()
      .then(() => logger.info('✓ DB closed'))
      .catch(() => {})
      .finally(() => process.exit(0));
  });
  // 5s 兜底
  setTimeout(() => {
    logger.error('强制关闭');
    process.exit(1);
  }, 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 未捕获异常
process.on('uncaughtException', (err) => {
  logger.error(`uncaughtException: ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`unhandledRejection: ${reason?.stack || reason}`);
});