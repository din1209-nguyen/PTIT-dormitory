import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import { createStudentSchema, updateStudentSchema } from './student.validation.js';
import * as ctrl from './student.controller.js';

const router = Router();

router.get('/export-excel', authenticate, requirePermission(PermissionCode.STUDENT_EXPORT), asyncHandler(ctrl.exportExcel));
router.get('/import-template', authenticate, asyncHandler(ctrl.importTemplate));
router.get('/me', authenticate, asyncHandler(ctrl.getMyStudent));
router.get('/', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.listStudents));
router.get('/stats', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.getStudentStats));
router.get('/:id', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.getStudent));
router.post('/', authenticate, requirePermission(PermissionCode.STUDENT_CREATE), validate(createStudentSchema), asyncHandler(ctrl.createStudent));
router.put('/:id', authenticate, requirePermission(PermissionCode.STUDENT_UPDATE), validate(updateStudentSchema), asyncHandler(ctrl.updateStudent));
router.post('/:id/add-to-waiting-list', authenticate, requirePermission(PermissionCode.STUDENT_UPDATE), asyncHandler(ctrl.addToWaitingList));
router.get('/:id/residence-history', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.getResidenceHistory));

export default router;
