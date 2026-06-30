import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import {
  createBuildingSchema, updateBuildingSchema,
  createFloorSchema, updateFloorSchema,
  createRoomSchema, updateRoomSchema,
  createBedSchema, updateBedSchema,
} from './dormitory.validation.js';
import * as ctrl from './dormitory.controller.js';

const router = Router();

// Buildings
router.get('/buildings', authenticate, requirePermission(PermissionCode.DORM_READ), asyncHandler(ctrl.listBuildings));
router.post('/buildings', authenticate, requirePermission(PermissionCode.DORM_CREATE), validate(createBuildingSchema), asyncHandler(ctrl.createBuilding));
router.put('/buildings/:id', authenticate, requirePermission(PermissionCode.DORM_UPDATE), validate(updateBuildingSchema), asyncHandler(ctrl.updateBuilding));
router.delete('/buildings/:id', authenticate, requirePermission(PermissionCode.DORM_DELETE), asyncHandler(ctrl.deleteBuilding));

// Floors
router.get('/floors', authenticate, requirePermission(PermissionCode.DORM_READ), asyncHandler(ctrl.listFloors));
router.post('/floors', authenticate, requirePermission(PermissionCode.DORM_CREATE), validate(createFloorSchema), asyncHandler(ctrl.createFloor));
router.put('/floors/:id', authenticate, requirePermission(PermissionCode.DORM_UPDATE), validate(updateFloorSchema), asyncHandler(ctrl.updateFloor));
router.delete('/floors/:id', authenticate, requirePermission(PermissionCode.DORM_DELETE), asyncHandler(ctrl.deleteFloor));

// Rooms
router.get('/rooms', authenticate, requirePermission(PermissionCode.DORM_READ), asyncHandler(ctrl.listRooms));
router.post('/rooms', authenticate, requirePermission(PermissionCode.DORM_CREATE), validate(createRoomSchema), asyncHandler(ctrl.createRoom));
router.put('/rooms/:id', authenticate, requirePermission(PermissionCode.DORM_UPDATE), validate(updateRoomSchema), asyncHandler(ctrl.updateRoom));
router.delete('/rooms/:id', authenticate, requirePermission(PermissionCode.DORM_DELETE), asyncHandler(ctrl.deleteRoom));

// Beds
router.get('/beds', authenticate, requirePermission(PermissionCode.DORM_READ), asyncHandler(ctrl.listBeds));
router.post('/beds', authenticate, requirePermission(PermissionCode.DORM_UPDATE), validate(createBedSchema), asyncHandler(ctrl.createBed));
router.put('/beds/:id', authenticate, requirePermission(PermissionCode.DORM_UPDATE), validate(updateBedSchema), asyncHandler(ctrl.updateBed));
router.delete('/beds/:id', authenticate, requirePermission(PermissionCode.DORM_DELETE), asyncHandler(ctrl.deleteBed));

export default router;
