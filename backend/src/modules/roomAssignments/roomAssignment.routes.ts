import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './roomAssignment.controller.js';

const router = Router();

router.post('/auto', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_AUTO), asyncHandler(ctrl.autoAssign));
router.post('/manual', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_MANUAL), asyncHandler(ctrl.manualAssign));
router.get('/semester/:semesterId', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.getBySemester));
router.get('/history/semester/:semesterId/export-excel', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.exportHistoryBySemester));
router.get('/history/semester/:semesterId', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.getHistoryBySemester));
router.get('/semester/:semesterId/unassigned', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.getUnassignedBySemester));
router.get('/student/:studentId', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.getByStudent));
router.get('/rooms/:roomId/members', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_READ), asyncHandler(ctrl.getRoomMembers));
router.delete('/:id/unassign', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_MANUAL), asyncHandler(ctrl.unassign));
router.put('/:id/transfer', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_MANUAL), asyncHandler(ctrl.transfer));
router.post('/semester/:semesterId/unassigned/remove', authenticate, requirePermission(PermissionCode.ROOM_ASSIGNMENT_MANUAL), asyncHandler(ctrl.removeUnassignedStudents));

export default router;
