const path = require('path');
require('./env'); // 自写 .env loader

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
  env: NODE_ENV,
  port: parseInt(process.env.PORT || '8888', 10),
  isProd: NODE_ENV === 'production',

  // 一键模式：Express 直接托管前端构建产物（前后端同端口）
  frontend: {
    dist: process.env.FRONTEND_DIST
      ? path.resolve(process.env.FRONTEND_DIST)
      : path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist'),
  },

  db: {
    path: path.resolve(__dirname, '..', '..', process.env.DB_PATH || './data/zmyl.db'),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
    loginWindowMs: parseInt(process.env.LOGIN_LIMIT_WINDOW_MS || '60000', 10),
    loginMax: parseInt(process.env.LOGIN_LIMIT_MAX || '10', 10),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.resolve(__dirname, '..', '..', process.env.LOG_FILE || './logs/server.log'),
  },

  upload: {
    dir: path.resolve(__dirname, '..', '..', process.env.UPLOAD_DIR || './uploads'),
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '100', 10),
  },

  autoSeed: process.env.AUTO_SEED !== '0',
};

if (config.isProd && config.jwt.secret === 'change-me-in-production') {
  console.error('[FATAL] 生产环境必须设置 JWT_SECRET 环境变量');
  process.exit(1);
}

module.exports = config;