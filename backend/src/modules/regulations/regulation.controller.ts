import type { Request, Response } from 'express';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import * as svc from './regulation.service.js';

export async function list(req: Request, res: Response) {
  const data = await svc.listRegulations({ status: req.query.status as string | undefined });
  sendSuccess(res, data);
}
export async function listPublished(_req: Request, res: Response) {
  sendSuccess(res, await svc.listPublished());
}
export async function get(req: Request, res: Response) {
  sendSuccess(res, await svc.getById(req.params.id as string));
}
export async function create(req: Request, res: Response) {
  sendCreated(res, await svc.create(req.body, req.user!.id));
}
export async function update(req: Request, res: Response) {
  sendSuccess(res, await svc.update(req.params.id as string, req.body));
}
export async function publish(req: Request, res: Response) {
  sendSuccess(res, await svc.publish(req.params.id as string, req.user!.id), 'Đã xuất bản nội quy');
}
export async function archive(req: Request, res: Response) {
  sendSuccess(res, await svc.archive(req.params.id as string), 'Đã lưu trữ nội quy');
}
