import type { Request, Response } from 'express';
import { sendSuccess, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import * as semesterService from './semester.service.js';

export async function listSemesters(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const result = await semesterService.listSemesters(pagination, { status: req.query.status as string | undefined });
  sendPaginated(res, result.items, result.pagination);
}

export async function getSemester(req: Request, res: Response) {
  const semester = await semesterService.getSemesterById(req.params.id as string);
  sendSuccess(res, semester);
}

export async function activateSemester(req: Request, res: Response) {
  const semester = await semesterService.activateSemester(req.params.id as string);
  sendSuccess(res, semester, 'Đã kích hoạt kỳ lưu trú');
}



export async function updateSemester(req: Request, res: Response) {
  const semester = await semesterService.updateSemester(req.params.id as string, req.body);
  sendSuccess(res, semester, 'Đã cập nhật thời gian kỳ lưu trú');
}

export async function revertSemester(req: Request, res: Response) {
  const semester = await semesterService.revertSemester(req.params.id as string);
  sendSuccess(res, semester, 'Đã hoàn tác kích hoạt kỳ lưu trú');
}
