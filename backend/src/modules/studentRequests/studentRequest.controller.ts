import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import { findOrCreateStudent } from '../../common/utils/studentHelper.js';
import * as svc from './studentRequest.service.js';

export async function create(req: Request, res: Response) {
  const student = await findOrCreateStudent(req.user!.id);
  if (!student) {
    res.status(400).json({ success: false, message: 'Tài khoản chưa liên kết hồ sơ sinh viên', errorCode: 'STUDENT_NOT_FOUND' });
    return;
  }
  const data = await svc.createRequest(student._id.toString(), req.body);
  sendCreated(res, data);
}

export async function getMyRequests(req: Request, res: Response) {
  const student = await findOrCreateStudent(req.user!.id);
  if (!student) {
    sendSuccess(res, []);
    return;
  }
  const data = await svc.getMyRequests(student._id.toString());
  sendSuccess(res, data);
}

export async function listAll(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const filters = {
    type: req.query.type as string | undefined,
    status: req.query.status as string | undefined,
  };
  const { items, pagination: meta } = await svc.listAll(filters, pagination);
  sendPaginated(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const data = await svc.getById(req.params.id as string);
  sendSuccess(res, data);
}

export async function updateStatus(req: Request, res: Response) {
  const data = await svc.updateStatus(
    req.params.id as string,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, data, 'Đã cập nhật trạng thái đơn từ');
}
