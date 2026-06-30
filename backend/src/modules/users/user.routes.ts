import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './user.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.USER_READ), asyncHandler(ctrl.list));
router.get('/:id', authenticate, requirePermission(PermissionCode.USER_READ), asyncHandler(ctrl.getById));
router.post('/', authenticate, requirePermission(PermissionCode.USER_CREATE), asyncHandler(ctrl.create));
router.put('/:id', authenticate, requirePermission(PermissionCode.USER_UPDATE), asyncHandler(ctrl.update));
router.patch('/:id/lock', authenticate, requirePermission(PermissionCode.USER_LOCK), asyncHandler(ctrl.lock));
router.patch('/:id/unlock', authenticate, requirePermission(PermissionCode.USER_UNLOCK), asyncHandler(ctrl.unlock));
router.post('/:id/reset-password', authenticate, requirePermission(PermissionCode.USER_UPDATE), asyncHandler(ctrl.resetPassword));

export default router;
