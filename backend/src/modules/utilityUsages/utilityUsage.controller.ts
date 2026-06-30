import type { Request, Response } from 'express';
import { sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as svc from './utilityUsage.service.js';

export async function create(req: Request, res: Response) {
  sendCreated(res, await svc.create(req.body, req.user!.id));
}

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await svc.list(pagination, {
    month: req.query.month ? Number(req.query.month) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    buildingId: req.query.buildingId as string | undefined,
    floorId: req.query.floorId as string | undefined,
    roomId: req.query.roomId as string | undefined,
  });
  sendPaginated(res, result.items, result.pagination);
}
