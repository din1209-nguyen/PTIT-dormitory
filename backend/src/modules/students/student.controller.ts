import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import { Student } from '../../models/student.model.js';
import { ResidenceType } from '../../common/constants/enums.js';
import * as studentService from './student.service.js';

export async function getMyStudent(req: Request, res: Response) {
  const student = await Student.findOne({ userId: req.user!.id }).lean();
  sendSuccess(res, student);
}

export async function getStudentStats(_req: Request, res: Response) {
  const stats = await studentService.getStudentStats();
  sendSuccess(res, stats);
}

export async function listStudents(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const filters = {
    gender: req.query.gender as string | undefined,
    department: req.query.department as string | undefined,
    residenceType: req.query.residenceType as string | undefined,
    academicYear: req.query.academicYear as string | undefined,
    isFreshman: req.query.isFreshman !== undefined ? req.query.isFreshman === 'true' : undefined,
  };
  const result = await studentService.listStudents(pagination, filters);
  sendPaginated(res, result.items, result.pagination);
}

export async function getStudent(req: Request, res: Response) {
  const student = await studentService.getStudentById(req.params.id as string);
  sendSuccess(res, student);
}

export async function createStudent(req: Request, res: Response) {
  const student = await studentService.createStudent(req.body);
  sendCreated(res, student);
}

export async function updateStudent(req: Request, res: Response) {
  const student = await studentService.updateStudent(req.params.id as string, req.body);
  sendSuccess(res, student);
}

export async function getResidenceHistory(req: Request, res: Response) {
  const records = await studentService.getResidenceHistory(req.params.id as string);
  sendSuccess(res, records);
}

export async function addToWaitingList(req: Request, res: Response) {
  const student = await studentService.addToWaitingList(
    req.params.id as string,
    req.body?.semesterId as string | undefined,
    req.body?.registeredAt,
  );
  sendSuccess(res, student, 'Đã đưa sinh viên vào danh sách chờ');
}

const HEADERS = ['Mã sinh viên', 'Họ và tên', 'Giới tính', 'Email', 'Số điện thoại', 'Địa chỉ', 'Lớp', 'Ngành', 'Khóa', 'Khoa', 'Thời điểm đăng ký'];

export async function exportExcel(_req: Request, res: Response) {
  const students = await Student.find({ residenceType: ResidenceType.RESIDING }).lean();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sinh viên');
  ws.addRow(HEADERS);
  for (const student of students) {
    ws.addRow([
      student.studentCode,
      student.fullName,
      student.gender === 'MALE' ? 'Nam' : 'Nữ',
      student.email,
      student.phone || '',
      student.address || '',
      student.className,
      student.major,
      student.academicYear,
      student.department,
      '',
    ]);
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
  await wb.xlsx.write(res);
  res.end();
}

export async function importTemplate(_req: Request, res: Response) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mẫu import');
  ws.addRow(HEADERS);
  ws.addRow(['N24DCCN001', 'Nguyen Van A', 'Nam', 'n24dccn001@student.ptithcm.edu.vn', '0912345678', '97 Man Thien, TP Thu Duc', 'D24CQCN01-N', 'Cong nghe thong tin', 'D24', 'Cong nghe thong tin', '01/08/2026 08:00']);
  ws.addRow(['N24DCVT002', 'Tran Thi B', 'Nữ', 'n24dcvt002@student.ptithcm.edu.vn', '0987654321', 'Km10 Nguyen Trai, Ha Dong', 'D24CQVT01-N', 'Ky thuat dien tu vien thong', 'D24', 'Vien thong', '01/08/2026 08:30']);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=import-template.xlsx');
  await wb.xlsx.write(res);
  res.end();
}
