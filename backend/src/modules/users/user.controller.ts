import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as svc from './user.service.js';

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await svc.list(pagination, {
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
  });
  sendPaginated(res, result.items, result.pagination);
}

export async function getById(req: Request, res: Response) {
  sendSuccess(res, await svc.getById(req.params.id as string));
}

export async function create(req: Request, res: Response) {
  sendCreated(res, await svc.create(req.body));
}

export async function update(req: Request, res: Response) {
  sendSuccess(res, await svc.update(req.params.id as string, req.body));
}

export async function lock(req: Request, res: Response) {
  sendSuccess(res, await svc.lock(req.params.id as string));
}

export async function unlock(req: Request, res: Response) {
  sendSuccess(res, await svc.unlock(req.params.id as string));
}

export async function resetPassword(req: Request, res: Response) {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự', errorCode: 'VALIDATION_ERROR' });
    return;
  }
  await svc.resetPassword(req.params.id as string, newPassword);
  sendSuccess(res, { message: 'Mật khẩu đã được đặt lại' });
}

export async function importExcel(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Vui lòng upload file Excel', errorCode: 'VALIDATION_ERROR' });
    return;
  }
  const result = await svc.importUsersFromExcel(req.file.buffer);
  sendSuccess(res, result);
}

export async function downloadTemplate(_req: Request, res: Response) {
  const buffer = await svc.generateImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=user-import-template.xlsx');
  res.send(buffer);
}
