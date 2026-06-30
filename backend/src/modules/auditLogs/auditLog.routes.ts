import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './auditLog.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.AUDIT_LOG_READ), asyncHandler(ctrl.list));

export default router;
