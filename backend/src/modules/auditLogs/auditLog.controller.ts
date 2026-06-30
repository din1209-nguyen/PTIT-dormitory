import type { Request, Response } from 'express';
import { sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as svc from './auditLog.service.js';

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await svc.list(pagination, {
    userId: req.query.userId as string | undefined,
    action: req.query.action as string | undefined,
    entityName: req.query.entityName as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  });
  sendPaginated(res, result.items, result.pagination);
}
