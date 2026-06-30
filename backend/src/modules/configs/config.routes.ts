import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './config.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.CONFIG_READ), asyncHandler(ctrl.listConfigs));
router.get('/faculties', authenticate, asyncHandler(ctrl.getFaculties));
router.get('/:key', authenticate, requirePermission(PermissionCode.CONFIG_READ), asyncHandler(ctrl.getConfig));
router.put('/:key', authenticate, requirePermission(PermissionCode.CONFIG_UPDATE), asyncHandler(ctrl.updateConfig));

export default router;
