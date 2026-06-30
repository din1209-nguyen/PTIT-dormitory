import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import * as raService from './roomAssignment.service.js';

const HISTORY_EXCEL_HEADERS = [
  'MSSV',
  'H\u1ecd t\u00ean',
  'Gi\u1edbi t\u00ednh',
  'Khoa',
  'L\u1edbp',
  'Tr\u1ea1ng th\u00e1i c\u01b0 tr\u00fa',
  'V\u1ecb tr\u00ed',
  'Ng\u00e0y x\u1ebfp',
  'Tr\u1ea1ng th\u00e1i x\u1ebfp ph\u00f2ng',
];

function getHistoryFilters(query: Request['query']): raService.AssignmentHistoryFilters {
  return {
    keyword: query.keyword as string | undefined,
    gender: query.gender as string | undefined,
    department: query.department as string | undefined,
    residenceType: query.residenceType as string | undefined,
    isFreshman: query.isFreshman !== undefined ? query.isFreshman === 'true' : undefined,
    building: query.building as string | undefined,
    room: query.room as string | undefined,
  };
}

function genderLabel(gender?: string) {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'N\u1eef';
  return '';
}

function residenceTypeLabel(type?: string) {
  switch (type) {
    case 'NOT_RESIDING': return 'Kh\u00f4ng \u1edf';
    case 'PENDING_ROOM': return 'Ch\u01b0a c\u00f3 ph\u00f2ng';
    case 'RESIDING': return '\u0110\u00e3 c\u00f3 ph\u00f2ng';
    default: return type || '';
  }
}

function assignmentStatusLabel(status?: string) {
  switch (status) {
    case 'ACTIVE': return '\u0110ang \u1edf';
    case 'ENDED': return '\u0110\u00e3 k\u1ebft th\u00fac';
    case 'CANCELLED': return '\u0110\u00e3 h\u1ee7y';
    default: return status || '';
  }
}

export async function autoAssign(req: Request, res: Response) {
  const { semesterId, excludeStudentIds } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await raService.autoAssignRooms(semesterId, req.user!.id, excludeStudentIds, session);
    await session.commitTransaction();
    sendSuccess(res, result, `Đã hoàn tất xếp phòng tự động: ${result.assignedCount}/${result.totalStudents} sinh viên`);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function manualAssign(req: Request, res: Response) {
  const assignment = await raService.manualAssign({ ...req.body, assignedBy: req.user!.id });
  sendCreated(res, assignment);
}

export async function getBySemester(req: Request, res: Response) {
  const data = await raService.getAssignmentsBySemester(req.params.semesterId as string);
  sendSuccess(res, data);
}

export async function getHistoryBySemester(req: Request, res: Response) {
  const data = await raService.getHistoryBySemester(req.params.semesterId as string, getHistoryFilters(req.query));
  sendSuccess(res, data);
}

export async function exportHistoryBySemester(req: Request, res: Response) {
  const data = await raService.getHistoryBySemester(req.params.semesterId as string, getHistoryFilters(req.query));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lich su luu tru');

  ws.addRow(['L\u1ecbch s\u1eed l\u01b0u tr\u00fa']);
  ws.mergeCells(1, 1, 1, HISTORY_EXCEL_HEADERS.length);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow(HISTORY_EXCEL_HEADERS);
  ws.getRow(2).font = { bold: true };

  for (const assignment of data as any[]) {
    const student = assignment.studentId || {};
    ws.addRow([
      student.studentCode || '',
      student.fullName || '',
      genderLabel(student.gender),
      student.department || '',
      student.className || '',
      residenceTypeLabel(student.residenceType),
      raService.formatAssignmentPosition(assignment),
      assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('vi-VN') : '',
      assignmentStatusLabel(assignment.status),
    ]);
  }

  ws.columns.forEach((column) => {
    column.width = 18;
  });
  ws.getColumn(2).width = 28;
  ws.getColumn(7).width = 32;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=residence-history-${req.params.semesterId}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
}

export async function getUnassignedBySemester(req: Request, res: Response) {
  const data = await raService.getUnassignedStudentsBySemester(req.params.semesterId as string);
  sendSuccess(res, data);
}

export async function getByStudent(req: Request, res: Response) {
  const data = await raService.getAssignmentsByStudent(req.params.studentId as string);
  sendSuccess(res, data);
}

export async function getRoomMembers(req: Request, res: Response) {
  const data = await raService.getRoomMembers(req.params.roomId as string, req.query.semesterId as string | undefined);
  sendSuccess(res, data);
}

export async function unassign(req: Request, res: Response) {
  const data = await raService.unassignRoom(req.params.id as string);
  sendSuccess(res, data, 'ÄÃ£ há»§y xáº¿p phÃ²ng');
}

export async function transfer(req: Request, res: Response) {
  const data = await raService.transferRoom(req.params.id as string, { ...req.body, assignedBy: req.user!.id });
  sendSuccess(res, data, 'Chuyển phòng thành công');
}

export async function removeUnassignedStudents(req: Request, res: Response) {
  const result = await raService.removeUnassignedStudents(req.params.semesterId as string, req.body.excludeStudentIds);
  sendSuccess(res, result, `Đã xóa ${result.count} sinh viên khỏi danh sách chờ xếp phòng`);
}
