import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './semester.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.SEMESTER_READ), asyncHandler(ctrl.listSemesters));
router.get('/:id', authenticate, requirePermission(PermissionCode.SEMESTER_READ), asyncHandler(ctrl.getSemester));
router.patch('/:id/activate', authenticate, requirePermission(PermissionCode.SEMESTER_ACTIVATE), asyncHandler(ctrl.activateSemester));
router.patch('/:id', authenticate, requirePermission(PermissionCode.SEMESTER_UPDATE), asyncHandler(ctrl.updateSemester));
router.patch('/:id/revert', authenticate, requirePermission(PermissionCode.SEMESTER_ACTIVATE), asyncHandler(ctrl.revertSemester));

export default router;
