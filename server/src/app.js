const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./utils/logger');
const securityHeaders = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/error');
const routes = require('./routes');

// 白名单：不需要鉴权（IoT 上报走 api_key 认证，见 coldchain.controller）
const WHITELIST = ['/health', '/auth/login', '/cold-chain/iot/report', '/cold-chain/iot/batch-report'];

function buildApp() {
  const app = express();

  // 1. 反代信任
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 2. body parser
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. 访问日志（跳过 /api/health）
  app.use(morgan(config.isProd ? 'combined' : 'dev', {
    skip: (req) => req.originalUrl === '/api/health',
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));

  // 4. CORS（函数式：可拿到 req，支持同源判定）
  app.use(cors((req, cb) => {
    const origin = req.headers.origin || '';
    // 同源 / 无 origin（curl 等）放行
    if (!origin) return cb(null, { origin: true, credentials: true });
    if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
      return cb(null, { origin: true, credentials: true });
    }
    // 本机任意端口放行（vite build 产物为 crossorigin module script，
    // 同源请求也会带 Origin 头，端口不固定：8888 生产 / 5173 dev / 自定义端口）
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, { origin: true, credentials: true });
    }
    // 同源放行：Origin 的主机名与请求 Host 一致（服务器 IP / 域名直访、nginx 同域反代）
    try {
      const originHost = new URL(origin).hostname;
      const requestHost = (req.headers.host || '').replace(/:\d+$/, '');
      if (originHost && originHost === requestHost) return cb(null, { origin: true, credentials: true });
    } catch (_) { /* origin 解析失败走下方拦截 */ }
    // 服务器部署额外放行：CORS_ORIGINS 里配置的 IP / 域名
    return cb(new Error(`CORS blocked: ${origin}（如为合法来源，请在 server/.env 的 CORS_ORIGINS 中配置）`));
  }));

  // 5. 安全头
  app.use(securityHeaders);

  // 6. 全局限速
  app.use(globalLimiter);

  // 7. 业务路由（统一鉴权：除白名单外都强制 JWT）
  app.use('/api', (req, res, next) => {
    if (WHITELIST.includes(req.path) || WHITELIST.includes(req.originalUrl.replace('/api', ''))) {
      return next();
    }
    return authMiddleware(req, res, next);
  }, routes);

  // 8. 静态资源（uploads）
  app.use('/uploads', express.static(config.upload.dir));

  // 9. 前端静态托管（一键模式：frontend/dist 存在时由本进程直接托管，前后端同端口）
  if (fs.existsSync(config.frontend.dist)) {
    logger.info(`[startup] 前端构建产物已挂载：${config.frontend.dist}`);
    app.use(express.static(config.frontend.dist, {
      maxAge: '7d',
      index: false,
      // index.html 禁缓存：否则发新版后浏览器仍加载旧 bundle，页面"改不动"
      setHeaders: (res, p) => {
        if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    // SPA 回退：非 /api /uploads 的 GET 一律返回 index.html（交给 vue-router）
    app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.frontend.dist, 'index.html'));
    });
  } else if (config.isProd) {
    logger.warn(`[startup] 未找到前端构建产物（${config.frontend.dist}），本进程仅提供 API 服务；请先构建前端或设置 FRONTEND_DIST`);
  }

  // 10. 404 + 错误处理
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp();