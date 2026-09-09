const router = require('express').Router();
const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { requireAction } = require('../middleware/rbac');
const ctrl = require('../controllers/user.controller');

const createUserSchema = Joi.object({
  username: Joi.string().min(2).max(64).required(),
  password: Joi.string().min(6).max(128).required(),
  name: Joi.string().min(1).max(64).required(),
  dept: Joi.string().max(64).allow('').optional(),
  role_code: Joi.string().required(),
  phone: Joi.string().max(32).allow('').optional(),
  email: Joi.string().max(128).allow('').optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().max(64).optional(),
  dept: Joi.string().max(64).allow('').optional(),
  role_code: Joi.string().optional(),
  phone: Joi.string().max(32).allow('').optional(),
  email: Joi.string().max(128).allow('').optional(),
  status: Joi.string().valid('启用', '禁用').optional(),
});

router.use(auth);

router.get('/roles/all', asyncHandler(ctrl.listRoles));
router.get('/', requireAction('user:list'), asyncHandler(ctrl.listUsers));
router.post('/', requireAction('user:create'), validate(createUserSchema), asyncHandler(ctrl.createUser));
router.put('/:id', requireAction('user:update'), validate(updateUserSchema), asyncHandler(ctrl.updateUser));
router.delete('/:id', requireAction('user:delete'), asyncHandler(ctrl.deleteUser));
router.put('/:id/reset-password', requireAction('user:update'), asyncHandler(ctrl.resetPassword));

module.exports = router;