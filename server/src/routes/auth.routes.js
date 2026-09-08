const router = require('express').Router();
const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimit');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const loginSchema = Joi.object({
  username: Joi.string().min(1).max(64).required(),
  password: Joi.string().min(1).max(128).required(),
});

const changePwdSchema = Joi.object({
  oldPassword: Joi.string().min(1).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(ctrl.login));
router.get('/me', auth, asyncHandler(ctrl.me));
router.post('/logout', auth, asyncHandler(ctrl.logout));
router.post('/change-password', auth, validate(changePwdSchema), asyncHandler(ctrl.changePassword));

module.exports = router;