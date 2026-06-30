import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import { createRequestSchema, updateStatusSchema } from './studentRequest.validation.js';
import * as ctrl from './studentRequest.controller.js';

const router = Router();

router.post('/', authenticate, requirePermission(PermissionCode.REQUEST_CREATE), validate(createRequestSchema), asyncHandler(ctrl.create));
router.get('/me', authenticate, asyncHandler(ctrl.getMyRequests));
router.get('/', authenticate, requirePermission(PermissionCode.REQUEST_READ), asyncHandler(ctrl.listAll));
router.get('/:id', authenticate, requirePermission(PermissionCode.REQUEST_READ), asyncHandler(ctrl.getById));
router.patch('/:id/status', authenticate, requirePermission(PermissionCode.REQUEST_UPDATE_STATUS), validate(updateStatusSchema), asyncHandler(ctrl.updateStatus));

export default router;
