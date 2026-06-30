import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import { createGeneralSchema, createPrivateSchema } from './notification.validation.js';
import * as ctrl from './notification.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.NOTIFICATION_READ), asyncHandler(ctrl.listAll));
router.post('/general', authenticate, requirePermission(PermissionCode.NOTIFICATION_SEND), validate(createGeneralSchema), asyncHandler(ctrl.createGeneral));
router.post('/private', authenticate, requirePermission(PermissionCode.NOTIFICATION_SEND), validate(createPrivateSchema), asyncHandler(ctrl.createPrivate));
router.get('/me', authenticate, asyncHandler(ctrl.getMyNotifications));
router.get('/me/unread-count', authenticate, asyncHandler(ctrl.getUnreadCount));
router.patch('/:id/read', authenticate, asyncHandler(ctrl.markRead));

export default router;
