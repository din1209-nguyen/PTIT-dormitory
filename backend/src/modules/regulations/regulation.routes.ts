import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './regulation.controller.js';

const router = Router();

router.get('/published', authenticate, asyncHandler(ctrl.listPublished));
router.get('/', authenticate, requirePermission(PermissionCode.REGULATION_READ), asyncHandler(ctrl.list));
router.get('/:id', authenticate, asyncHandler(ctrl.get));
router.post('/', authenticate, requirePermission(PermissionCode.REGULATION_MANAGE), asyncHandler(ctrl.create));
router.put('/:id', authenticate, requirePermission(PermissionCode.REGULATION_MANAGE), asyncHandler(ctrl.update));
router.patch('/:id/publish', authenticate, requirePermission(PermissionCode.REGULATION_PUBLISH), asyncHandler(ctrl.publish));
router.patch('/:id/archive', authenticate, requirePermission(PermissionCode.REGULATION_MANAGE), asyncHandler(ctrl.archive));

export default router;
