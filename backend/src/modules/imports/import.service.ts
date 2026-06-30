import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { Semester } from '../../models/semester.model.js';
import { Student } from '../../models/student.model.js';
import { ResidenceRecord } from '../../models/residenceRecord.model.js';
import { ImportBatch, ImportStatus } from '../../models/importBatch.model.js';
import { ImportRowError } from '../../models/importRowError.model.js';
import { AppError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { SemesterStatus, Gender } from '../../common/constants/enums.js';
import { logger } from '../../config/logger.js';
import {
  queueRegistrationEmail,
  registerStudentForPreparingSemester,
  type RegistrationEmailJob,
} from '../students/student.service.js';

const IMPORT_COLUMNS = [
  { key: 'studentCode', label: 'Mã sinh viên', aliases: ['Mã SV', 'MSSV', 'MSV'], required: true },
  { key: 'fullName', label: 'Họ và tên', required: true },
  { key: 'gender', label: 'Giới tính', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'className', label: 'Lớp', required: true },
  { key: 'major', label: 'Ngành', required: true },
  { key: 'academicYear', label: 'Khóa', required: true },
  { key: 'department', label: 'Khoa', required: true },
  { key: 'registeredAt', label: 'Thời điểm đăng ký', aliases: ['Thời gian', 'Thời gian đăng ký', 'Ngày đăng ký'], required: false },
] as const;
type ImportColumnKey = typeof IMPORT_COLUMNS[number]['key'];
const REQUIRED_IMPORT_COLUMNS = IMPORT_COLUMNS.filter((column) => column.required);
const MIN_HEADER_MATCH_COUNT = 4;

interface ParsedRowManager {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  gender: Gender;
  email: string;
  className: string;
  major: string;
  academicYear: string;
  department: string;
  registeredAt: Date;
  action: 'CREATE_STUDENT' | 'CREATE_ACCOUNT' | 'RE_REGISTER';
}

interface RowError {
  rowNumber: number;
  fieldName?: string;
  errorMessage: string;
  rawData?: Record<string, unknown>;
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/Ä‘/g, 'd')
    .replace(/Ä/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in v) return (v as { text: string }).text.trim();
  if (typeof v === 'object' && 'result' in v) return String((v as { result?: unknown }).result ?? '').trim();
  return String(v).trim();
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function excelSerialToDate(value: number) {
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = value - Math.floor(value) + 0.0000001;
  const totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

function parseDateText(value: string) {
  const text = value.trim();
  if (!text) return null;

  const vnMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (vnMatch) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = vnMatch;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
    if (
      date.getFullYear() === Number(yyyy)
      && date.getMonth() === Number(mm) - 1
      && date.getDate() === Number(dd)
    ) {
      return date;
    }
    return null;
  }

  const isoDate = new Date(text);
  return isValidDate(isoDate) ? isoDate : null;
}

function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value === 'number') {
    const date = excelSerialToDate(value);
    return isValidDate(date) ? date : null;
  }
  if (typeof value === 'string') return parseDateText(value);
  if (typeof value === 'object' && 'result' in value) return parseDateValue((value as { result?: unknown }).result);
  if (typeof value === 'object' && 'text' in value) return parseDateText(String((value as { text?: unknown }).text ?? ''));
  return parseDateText(String(value));
}

function parseRegistrationTime(cell: ExcelJS.Cell, fallback: Date): { registeredAt: Date } | { error: string } {
  if (!cell.value || !cellStr(cell)) return { registeredAt: fallback };
  const registeredAt = parseDateValue(cell.value);
  return registeredAt ? { registeredAt } : { error: 'Thời điểm đăng ký không hợp lệ' };
}

function parseGender(value: string): Gender | null {
  const normalized = normalizeHeader(value);
  if (normalized === 'nam' || normalized === 'male') return Gender.MALE;
  if (normalized === 'nu' || normalized === 'female') return Gender.FEMALE;
  return null;
}

function getHeaderNames(column: typeof IMPORT_COLUMNS[number]) {
  return [column.label, ...('aliases' in column ? column.aliases : [])];
}

function findHeaderIndex(indexes: Map<string, number>, column: typeof IMPORT_COLUMNS[number]) {
  for (const name of getHeaderNames(column)) {
    const index = indexes.get(normalizeHeader(name));
    if (index) return index;
  }
  return undefined;
}

function mapHeaders(headerRow: ExcelJS.Row) {
  const indexes = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    indexes.set(normalizeHeader(cellStr(cell)), colNumber);
  });

  const required = new Map<ImportColumnKey, number>();
  for (const column of REQUIRED_IMPORT_COLUMNS) {
    const index = findHeaderIndex(indexes, column);
    if (!index) {
      throw new AppError(400, `Header thiếu cột "${column.label}"`, ErrorCode.EXCEL_INVALID_FORMAT);
    }
    required.set(column.key, index);
  }
  const registeredAtColumn = IMPORT_COLUMNS.find((column) => column.key === 'registeredAt')!;
  const registeredAtIndex = findHeaderIndex(indexes, registeredAtColumn);
  if (registeredAtIndex) required.set('registeredAt', registeredAtIndex);
  return required;
}

function hasHeaderRow(row: ExcelJS.Row) {
  const normalizedCells = new Set<string>();
  row.eachCell((cell) => {
    const value = normalizeHeader(cellStr(cell));
    if (value) normalizedCells.add(value);
  });
  const matchCount = IMPORT_COLUMNS.filter((column) => getHeaderNames(column).some((name) => normalizedCells.has(normalizeHeader(name)))).length;
  return matchCount >= MIN_HEADER_MATCH_COUNT;
}

function buildColumnMapFromFixedOrder() {
  const map = new Map<ImportColumnKey, number>();
  IMPORT_COLUMNS.forEach((column, index) => {
    map.set(column.key, index + 1);
  });
  return map;
}

function getRawRow(row: ExcelJS.Row, headerMap: Map<ImportColumnKey, number>) {
  const raw = {} as Record<ImportColumnKey, string>;
  for (const column of IMPORT_COLUMNS) {
    const index = headerMap.get(column.key);
    raw[column.key] = index ? cellStr(row.getCell(index)) : '';
  }
  return raw;
}

export async function importExcelAndAssign(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  semesterId: string,
  importedBy: string,
  options: { isPreview?: boolean; ignoreErrors?: boolean } = {},
) {
  const semester = await Semester.findById(semesterId);
  if (!semester) throw new AppError(400, 'Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (![SemesterStatus.PREPARING, SemesterStatus.ACTIVE].includes(semester.status)) {
    throw new AppError(400, 'Kỳ lưu trú phải ở trạng thái PREPARING hoặc ACTIVE', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError(400, 'File Excel trống', ErrorCode.EXCEL_INVALID_FORMAT);

  if (sheet.actualRowCount < 1) throw new AppError(400, 'File Excel trống', ErrorCode.EXCEL_INVALID_FORMAT);

  const firstRow = sheet.getRow(1);
  const hasHeaders = hasHeaderRow(firstRow);
  const headerMap = hasHeaders ? mapHeaders(firstRow) : buildColumnMapFromFixedOrder();
  const firstDataRow = hasHeaders ? 2 : 1;
  const rows: ParsedRowManager[] = [];
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const importStartedAt = new Date();
  const registeredAtCol = headerMap.get('registeredAt');

  const candidateCodes = new Set<string>();
  const candidateEmails = new Set<string>();
  for (let rowNum = firstDataRow; rowNum <= sheet.rowCount; rowNum++) {
    const raw = getRawRow(sheet.getRow(rowNum), headerMap);
    if (raw.studentCode) candidateCodes.add(raw.studentCode);
    if (raw.email) candidateEmails.add(raw.email.toLowerCase());
  }

  const allStudents = await Student.find({
    $or: [
      { studentCode: { $in: Array.from(candidateCodes) } },
      { email: { $in: Array.from(candidateEmails) } },
    ],
  }, { studentCode: 1, email: 1, userId: 1 }).lean();
  const studentsByCode = new Map(allStudents.map((s) => [s.studentCode, s]));
  const studentsByEmail = new Map(allStudents.map((s) => [s.email, s]));
  const existingRecords = await ResidenceRecord.find({
    semesterId,
    studentId: { $in: allStudents.map((s) => s._id) },
  }).lean();
  const registeredStudentIds = new Set(existingRecords.map((r) => r.studentId.toString()));

  for (let rowNum = firstDataRow; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const raw = getRawRow(row, headerMap);
    if (REQUIRED_IMPORT_COLUMNS.every((column) => !raw[column.key])) continue;

    const rowErrors: RowError[] = [];
    const addErr = (field: string, msg: string) => rowErrors.push({ rowNumber: rowNum, fieldName: field, errorMessage: msg, rawData: raw });

    const studentCode = raw.studentCode;
    const fullName = raw.fullName;
    const gender = parseGender(raw.gender);
    const email = raw.email.toLowerCase();
    const className = raw.className;
    const major = raw.major;
    const academicYear = raw.academicYear;
    const department = raw.department;
    let registeredAt = importStartedAt;
    if (registeredAtCol) {
      const parsedRegistrationTime = parseRegistrationTime(row.getCell(registeredAtCol), importStartedAt);
      if ('error' in parsedRegistrationTime) {
        addErr('Thời điểm đăng ký', parsedRegistrationTime.error);
      } else {
        registeredAt = parsedRegistrationTime.registeredAt;
      }
    }

    if (!studentCode) addErr('Mã sinh viên', 'Bắt buộc');
    if (!fullName) addErr('Họ và tên', 'Bắt buộc');
    if (!gender) addErr('Giới tính', 'Phải là Nam/Nữ hoặc MALE/FEMALE');
    if (!email) addErr('Email', 'Bắt buộc');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) addErr('Email', 'Sai định dạng');
    if (!className) addErr('Lớp', 'Bắt buộc');
    if (!major) addErr('Ngành', 'Bắt buộc');
    if (!academicYear) addErr('Khóa', 'Bắt buộc');
    if (!department) addErr('Khoa', 'Bắt buộc');

    if (studentCode && seenCodes.has(studentCode)) addErr('Mã sinh viên', 'Trùng trong file');
    if (email && seenEmails.has(email)) addErr('Email', 'Trùng trong file');
    seenCodes.add(studentCode);
    seenEmails.add(email);

    const existingByCode = studentsByCode.get(studentCode);
    const existingByEmail = studentsByEmail.get(email);
    if (existingByEmail && (!existingByCode || existingByEmail._id.toString() !== existingByCode._id.toString())) {
      addErr('Email', 'Email đã thuộc sinh viên khác');
    }
    if (existingByCode && registeredStudentIds.has(existingByCode._id.toString())) {
      addErr('Mã sinh viên', 'Sinh viên đã có trong danh sách chờ của kỳ này');
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      rowNumber: rowNum,
      studentCode,
      fullName,
      gender: gender!,
      email,
      className,
      major,
      academicYear,
      department,
      registeredAt,
      action: !existingByCode ? 'CREATE_STUDENT' : existingByCode.userId ? 'RE_REGISTER' : 'CREATE_ACCOUNT',
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      rowNumber: firstDataRow,
      fieldName: 'File',
      errorMessage: 'File Excel không có dữ liệu sinh viên',
    });
  }

  if (options.isPreview) {
    return { validRows: rows, errorRows: errors };
  }

  if (errors.length > 0) {
    const batch = await ImportBatch.create({
      semesterId,
      fileName,
      totalRows: rows.length + errors.length,
      status: ImportStatus.FAILED,
      failedRows: errors.length,
      successRows: 0,
      importedBy,
      finishedAt: new Date(),
    });
    await ImportRowError.insertMany(errors.map((e) => ({ importBatchId: batch._id, ...e })));
    return { batch, errors, summary: { createdStudents: 0, createdAccounts: 0, reRegistered: 0, queuedEmails: 0 } };
  }

  const batch = await ImportBatch.create({
    semesterId,
    fileName,
    totalRows: rows.length + errors.length,
    status: ImportStatus.PROCESSING,
    importedBy,
  });

  if (errors.length > 0) {
    await ImportRowError.insertMany(errors.map((e) => ({ importBatchId: batch._id, ...e })));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const emailJobs: RegistrationEmailJob[] = [];
  let createdStudents = 0;
  let createdAccounts = 0;
  let reRegistered = 0;

  try {
    for (const row of rows) {
      const result = await registerStudentForPreparingSemester({
        studentCode: row.studentCode,
        fullName: row.fullName,
        gender: row.gender,
        email: row.email,
        className: row.className,
        major: row.major,
        academicYear: row.academicYear,
        department: row.department,
        registeredAt: row.registeredAt,
        isFreshman: false,
      }, { session, semesterId });

      if (result.isNewStudent) createdStudents++;
      if (result.isNewAccount) createdAccounts++;
      if (!result.isNewStudent) reRegistered++;
      emailJobs.push(result.emailJob);
    }

    await session.commitTransaction();

    void Promise.allSettled(emailJobs.map((job) => queueRegistrationEmail(job)))
      .then((results) => {
        const failed = results.filter((result) => result.status === 'rejected').length;
        if (failed > 0) logger.warn(`[Import] ${failed}/${emailJobs.length} registration emails failed to queue`);
      })
      .catch((err) => logger.error('Failed to process registration email jobs after import', { error: err }));

    batch.status = ImportStatus.SUCCESS;
    batch.successRows = rows.length;
    batch.failedRows = errors.length;
    batch.finishedAt = new Date();
    await batch.save();

    return {
      batch,
      errors,
      summary: { createdStudents, createdAccounts, reRegistered, queuedEmails: emailJobs.length },
    };
  } catch (err) {
    await session.abortTransaction();

    batch.status = ImportStatus.ROLLED_BACK;
    batch.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    batch.finishedAt = new Date();
    await batch.save();

    if (err instanceof AppError) throw err;
    throw new AppError(500, `Import tháº¥t báº¡i: ${batch.errorMessage}`, ErrorCode.EXCEL_IMPORT_ROLLED_BACK);
  } finally {
    session.endSession();
  }
}

export async function listBatches(semesterId?: string) {
  const query: Record<string, unknown> = {};
  if (semesterId) query.semesterId = semesterId;
  return ImportBatch.find(query).sort({ createdAt: -1 }).populate('semesterId', 'name').lean();
}

export async function getBatchErrors(batchId: string) {
  return ImportRowError.find({ importBatchId: batchId }).sort({ rowNumber: 1 }).lean();
}
