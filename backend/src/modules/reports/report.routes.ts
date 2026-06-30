import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './report.controller.js';

const router = Router();

router.get('/residence', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.residence));
router.get('/dormitory-capacity', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.dormitoryCapacity));
router.get('/utility', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.utility));
router.get('/payments', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.payments));
router.get('/violations', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.violations));
router.get('/requests', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.requests));
router.get('/trends', authenticate, requirePermission(PermissionCode.REPORT_READ), asyncHandler(ctrl.trends));
export default router;
