import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './violation.controller.js';

const router = Router();

router.get('/me', authenticate, asyncHandler(ctrl.getMyViolations));
router.get('/', authenticate, requirePermission(PermissionCode.VIOLATION_READ), asyncHandler(ctrl.list));
router.post('/', authenticate, requirePermission(PermissionCode.VIOLATION_CREATE), asyncHandler(ctrl.create));
router.get('/student/:studentId', authenticate, requirePermission(PermissionCode.VIOLATION_READ), asyncHandler(ctrl.getByStudent));
router.put('/:id', authenticate, requirePermission(PermissionCode.VIOLATION_UPDATE), asyncHandler(ctrl.update));

export default router;
