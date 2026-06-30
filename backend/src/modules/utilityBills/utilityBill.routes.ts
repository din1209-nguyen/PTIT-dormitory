import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './utilityBill.controller.js';

const router = Router();

router.post('/generate', authenticate, requirePermission(PermissionCode.UTILITY_BILL_CREATE), asyncHandler(ctrl.generate));
router.get('/me', authenticate, asyncHandler(ctrl.getMyBills));
router.get('/', authenticate, requirePermission(PermissionCode.UTILITY_READ), asyncHandler(ctrl.list));
router.get('/:id', authenticate, requirePermission(PermissionCode.UTILITY_READ), asyncHandler(ctrl.getById));
router.patch('/:id/mark-overdue', authenticate, requirePermission(PermissionCode.UTILITY_BILL_UPDATE), asyncHandler(ctrl.markOverdue));
router.patch('/:id/cancel', authenticate, requirePermission(PermissionCode.UTILITY_BILL_UPDATE), asyncHandler(ctrl.cancel));

export default router;
