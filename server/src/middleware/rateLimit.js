const rateLimit = require('express-rate-limit');
const config = require('../config');
const { fail } = require('../utils/response');

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试', code: 429 },
});

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: '登录尝试过多，请稍后再试', code: 429 },
});

module.exports = { globalLimiter, loginLimiter };