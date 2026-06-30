import type { Request, Response } from 'express';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import * as svc from './dormitory.service.js';

// Building
export async function listBuildings(req: Request, res: Response) {
  const data = await svc.listBuildings({ isActive: req.query.isActive as string });
  sendSuccess(res, data);
}
export async function createBuilding(req: Request, res: Response) {
  const data = await svc.createBuilding(req.body);
  sendCreated(res, data);
}
export async function updateBuilding(req: Request, res: Response) {
  const data = await svc.updateBuilding(req.params.id as string, req.body);
  sendSuccess(res, data);
}
export async function deleteBuilding(req: Request, res: Response) {
  await svc.deleteBuilding(req.params.id as string);
  sendSuccess(res, { message: 'Xóa tòa nhà thành công' });
}

// Floor
export async function listFloors(req: Request, res: Response) {
  const data = await svc.listFloors(req.query.buildingId as string);
  sendSuccess(res, data);
}
export async function createFloor(req: Request, res: Response) {
  const data = await svc.createFloor(req.body);
  sendCreated(res, data);
}
export async function updateFloor(req: Request, res: Response) {
  const data = await svc.updateFloor(req.params.id as string, req.body);
  sendSuccess(res, data);
}
export async function deleteFloor(req: Request, res: Response) {
  await svc.deleteFloor(req.params.id as string);
  sendSuccess(res, { message: 'Xóa tầng thành công' });
}

// Room
export async function listRooms(req: Request, res: Response) {
  const data = await svc.listRooms({
    buildingId: req.query.buildingId as string,
    floorId: req.query.floorId as string,
    genderType: req.query.genderType as string,
    status: req.query.status as string,
    populate: req.query.populate === 'true',
  });
  sendSuccess(res, data);
}
export async function createRoom(req: Request, res: Response) {
  const data = await svc.createRoom(req.body);
  sendCreated(res, data);
}
export async function updateRoom(req: Request, res: Response) {
  const { room, warning } = await svc.updateRoom(req.params.id as string, req.body);
  sendSuccess(res, { room, ...(warning && { warning }) });
}
export async function deleteRoom(req: Request, res: Response) {
  await svc.deleteRoom(req.params.id as string);
  sendSuccess(res, { message: 'Xóa phòng thành công' });
}

// Bed
export async function listBeds(req: Request, res: Response) {
  const data = await svc.listBeds(req.query.roomId as string);
  sendSuccess(res, data);
}
export async function createBed(req: Request, res: Response) {
  const data = await svc.createBed(req.body);
  sendCreated(res, data);
}
export async function updateBed(req: Request, res: Response) {
  const data = await svc.updateBed(req.params.id as string, req.body);
  sendSuccess(res, data);
}
export async function deleteBed(req: Request, res: Response) {
  await svc.deleteBed(req.params.id as string);
  sendSuccess(res, { message: 'Xóa giường thành công' });
}
