import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { uploadExcel } from '../../common/middlewares/uploadExcel.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import * as ctrl from './import.controller.js';

const router = Router();

router.post('/students/import-excel', authenticate, requirePermission(PermissionCode.STUDENT_IMPORT), uploadExcel, asyncHandler(ctrl.importExcel));
router.get('/import-batches', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.listBatches));
router.get('/import-batches/:id/errors', authenticate, requirePermission(PermissionCode.STUDENT_READ), asyncHandler(ctrl.getBatchErrors));

export default router;
