import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './dashboard.controller.js';

const router = Router();


router.get('/admin', authenticate, requirePermission(PermissionCode.AUDIT_LOG_READ), asyncHandler(ctrl.admin));
router.get('/student', authenticate, asyncHandler(ctrl.student));

export default router;
