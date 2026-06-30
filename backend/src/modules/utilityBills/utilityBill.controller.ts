import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as svc from './utilityBill.service.js';

export async function generate(req: Request, res: Response) {
  const result = await svc.generateBills(req.body.month, req.body.year, req.user!.id);
  sendCreated(res, result);
}

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await svc.list(pagination, {
    month: req.query.month ? Number(req.query.month) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    status: req.query.status as string | undefined,
    buildingId: req.query.buildingId as string | undefined,
  });
  sendPaginated(res, result.items, result.pagination);
}

export async function getById(req: Request, res: Response) {
  sendSuccess(res, await svc.getById(req.params.id as string));
}

export async function getMyBills(req: Request, res: Response) {
  sendSuccess(res, await svc.getMyBills(req.user!.id));
}

export async function markOverdue(req: Request, res: Response) {
  sendSuccess(res, await svc.markOverdue(req.params.id as string));
}

export async function cancel(req: Request, res: Response) {
  sendSuccess(res, await svc.cancel(req.params.id as string));
}
