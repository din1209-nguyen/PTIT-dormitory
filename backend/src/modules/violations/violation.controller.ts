import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as svc from './violation.service.js';

export async function create(req: Request, res: Response) {
  sendCreated(res, await svc.create(req.body, req.user!.id));
}
export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await svc.list(pagination, {
    studentId: req.query.studentId as string | undefined,
    semesterId: req.query.semesterId as string | undefined,
    status: req.query.status as string | undefined,
  });
  sendPaginated(res, result.items, result.pagination);
}
export async function getByStudent(req: Request, res: Response) {
  sendSuccess(res, await svc.getByStudent(req.params.studentId as string));
}
export async function getMyViolations(req: Request, res: Response) {
  sendSuccess(res, await svc.getMyViolations(req.user!.id));
}
export async function update(req: Request, res: Response) {
  sendSuccess(res, await svc.update(req.params.id as string, req.body));
}
