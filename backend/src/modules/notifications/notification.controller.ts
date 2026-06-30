import type { Request, Response } from 'express';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { findOrCreateStudent } from '../../common/utils/studentHelper.js';
import * as svc from './notification.service.js';

export async function listAll(_req: Request, res: Response) {
  const data = await svc.listAll();
  sendSuccess(res, data);
}

export async function createGeneral(req: Request, res: Response) {
  const data = await svc.createGeneral(req.body, req.user!.id);
  sendCreated(res, data);
}

export async function createPrivate(req: Request, res: Response) {
  const data = await svc.createPrivate(req.body, req.user!.id);
  sendCreated(res, data);
}

export async function getMyNotifications(req: Request, res: Response) {
  const student = await findOrCreateStudent(req.user!.id);
  if (!student) {
    sendSuccess(res, []);
    return;
  }
  const data = await svc.getMyNotifications(student._id.toString());
  sendSuccess(res, data);
}

export async function getUnreadCount(req: Request, res: Response) {
  const student = await findOrCreateStudent(req.user!.id);
  if (!student) {
    sendSuccess(res, { count: 0 });
    return;
  }
  const count = await svc.getUnreadCount(student._id.toString());
  sendSuccess(res, { count });
}

export async function markRead(req: Request, res: Response) {
  const student = await findOrCreateStudent(req.user!.id);
  if (!student) {
    sendSuccess(res, null, 'Đã đánh dấu đã đọc');
    return;
  }
  await svc.markRead(req.params.id as string, student._id.toString());
  sendSuccess(res, null, 'Đã đánh dấu đã đọc');
}
