import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './payment.controller.js';

const router = Router();

router.post('/vnpay/create', authenticate, requirePermission(PermissionCode.PAYMENT_CREATE), asyncHandler(ctrl.createVnpayPayment));
router.get('/vnpay/return', asyncHandler(ctrl.vnpayReturn));
router.get('/vnpay/ipn', ctrl.vnpayIpn);
router.get('/status', authenticate, requirePermission(PermissionCode.PAYMENT_READ), asyncHandler(ctrl.checkStatus));
router.post('/cash-confirm', authenticate, requirePermission(PermissionCode.PAYMENT_CONFIRM_CASH), asyncHandler(ctrl.cashConfirm));
router.get('/bill/:billId', authenticate, requirePermission(PermissionCode.PAYMENT_READ), asyncHandler(ctrl.getByBill));

export default router;
