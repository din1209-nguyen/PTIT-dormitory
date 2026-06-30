import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { User } from '../../models/user.model.js';
import { Student } from '../../models/student.model.js';
import { RefreshToken } from '../../models/refreshToken.model.js';
import { AppError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { UserStatus } from '../../common/constants/statuses.js';
import { Gender, ResidenceType } from '../../common/constants/enums.js';
import { Role } from '../../common/constants/roles.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

export async function list(pagination: PaginationQuery, filters: { role?: string; status?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;

  if (pagination.keyword) {
    query.$or = [
      { username: { $regex: pagination.keyword, $options: 'i' } },
      { email: { $regex: pagination.keyword, $options: 'i' } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    User.find(query)
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}

export async function getById(id: string): Promise<Record<string, unknown>> {
  const user = await User.findById(id).lean();
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  if (user.role === Role.STUDENT) {
    const studentInfo = await Student.findOne({ userId: id }).lean();
    return { ...user, studentInfo };
  }

  return user;
}

export async function create(data: { username: string; email: string; password: string; role: string; fullName?: string; gender?: string; className?: string; major?: string; academicYear?: string; department?: string; isFreshman?: boolean; }) {
  const existing = await User.findOne({ $or: [{ username: data.username }, { email: data.email }] });
  if (existing) throw new AppError(409, 'Username hoặc email đã tồn tại', ErrorCode.VALIDATION_ERROR);

  if (data.role === Role.ADMIN) throw new AppError(403, 'Không thể cấp quyền ADMIN', ErrorCode.FORBIDDEN);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await User.create([{
      username: data.username,
      email: data.email,
      passwordHash,
      role: data.role,
      status: UserStatus.INACTIVE,
      forcePasswordChange: data.role === Role.STUDENT,
    }], { session });

    if (data.role === Role.STUDENT) {
      await Student.create([{
        userId: user._id,
        studentCode: data.username,
        fullName: data.fullName || data.username,
        email: data.email,
        gender: data.gender || 'MALE',
        department: data.department || '',
        academicYear: data.academicYear || '',
        className: data.className || '',
        major: data.major || '',
        residenceType: ResidenceType.NOT_RESIDING,
        isFreshman: data.isFreshman || false,
      }], { session });
    }

    await session.commitTransaction();
    const { ...userObj } = user.toObject();
    delete (userObj as Record<string, unknown>).passwordHash;
    return userObj;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function update(id: string, data: { username?: string; email?: string; role?: string }) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  // Không cho phép chỉnh sửa tài khoản ADMIN khác
  if (user.role === Role.ADMIN) {
    throw new AppError(403, 'Không thể chỉnh sửa tài khoản Quản trị viên khác', ErrorCode.FORBIDDEN);
  }

  if (data.username && data.username !== user.username) {
    const existing = await User.findOne({ username: data.username });
    if (existing) throw new AppError(409, 'Tên đăng nhập (Username) đã tồn tại', ErrorCode.VALIDATION_ERROR);
    user.username = data.username;
  }

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new AppError(409, 'Email đã tồn tại trong hệ thống', ErrorCode.VALIDATION_ERROR);
    user.email = data.email;
  }

  if (data.role) {
    if (data.role === Role.ADMIN) throw new AppError(403, 'Không thể cấp quyền ADMIN', ErrorCode.FORBIDDEN);
    user.role = data.role as Role;
  }

  await user.save();

  if (user.role === Role.STUDENT && (data.username || data.email)) {
    await Student.findOneAndUpdate(
      { userId: user._id },
      {
        ...(data.username && { studentCode: data.username }),
        ...(data.email && { email: data.email }),
      }
    );
  }

  return user.toObject();
}

export async function lock(id: string) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  // Không cho phép khóa tài khoản ADMIN
  if (user.role === Role.ADMIN) {
    throw new AppError(403, 'Không thỉ khóa tài khoản Quản trị viên', ErrorCode.FORBIDDEN);
  }

  if (user.status === UserStatus.LOCKED) throw new AppError(400, 'Tài khoản đã bị khóa', ErrorCode.VALIDATION_ERROR);

  user.status = UserStatus.LOCKED;
  user.tokenVersion += 1;
  await user.save();

  await RefreshToken.deleteMany({ userId: id });

  return user.toObject();
}

export async function unlock(id: string) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  // Không cho phép mở khóa tài khoản ADMIN (ADMIN không bị khóa)
  if (user.role === Role.ADMIN) {
    throw new AppError(403, 'Không thỉ thực hiện thao tác này với tài khoản Quản trị viên', ErrorCode.FORBIDDEN);
  }

  if (user.status === UserStatus.ACTIVE) throw new AppError(400, 'Tài khoản đang hoạt động', ErrorCode.VALIDATION_ERROR);

  user.status = UserStatus.ACTIVE;
  await user.save();

  return user.toObject();
}

export async function resetPassword(id: string, newPassword: string) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  // Không cho phép reset mật khẩu của tài khoản ADMIN khác
  if (user.role === Role.ADMIN) {
    throw new AppError(403, 'Không thể đặt lại mật khẩu tài khoản Quản trị viên khác', ErrorCode.FORBIDDEN);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  user.forcePasswordChange = true;
  await user.save();

  await RefreshToken.deleteMany({ userId: id });
}

const IMPORT_HEADERS = ['Username (Mã SV)', 'Họ và tên', 'Giới tính', 'Email', 'Mật khẩu', 'Role', 'Lớp', 'Ngành', 'Khóa', 'Khoa'];
const ALLOWED_ROLES = [Role.STUDENT, Role.MANAGER];

interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in v) return (v as { text: string }).text.trim();
  return String(v).trim();
}

export async function importUsersFromExcel(buffer: Buffer | ArrayBuffer | Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError(400, 'File Excel trống', ErrorCode.EXCEL_INVALID_FORMAT);

  const headerRow = sheet.getRow(1);
  for (let i = 0; i < IMPORT_HEADERS.length; i++) {
    const actual = cellStr(headerRow.getCell(i + 1));
    if (actual !== IMPORT_HEADERS[i]) {
      throw new AppError(400, `Header sai ở cột ${i + 1}: cần "${IMPORT_HEADERS[i]}", nhận "${actual}"`, ErrorCode.EXCEL_INVALID_FORMAT);
    }
  }

  const rows: { row: number; username: string; fullName: string; gender: Gender; email: string; password: string; role: string; className: string; major: string; academicYear: string; department: string; isFreshman: boolean }[] = [];
  const errors: ImportRowError[] = [];
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const username = cellStr(row.getCell(1));
    const fullName = cellStr(row.getCell(2));
    const genderStr = cellStr(row.getCell(3));
    const email = cellStr(row.getCell(4)).toLowerCase();
    const password = cellStr(row.getCell(5));
    const role = cellStr(row.getCell(6)).toUpperCase();
    const className = cellStr(row.getCell(7));
    const major = cellStr(row.getCell(8));
    const academicYear = cellStr(row.getCell(9));
    const department = cellStr(row.getCell(10));

    if (!username && !email) continue;

    const addErr = (field: string, msg: string) => errors.push({ row: rowNum, field, message: msg });

    if (!username) addErr('Username', 'Bắt buộc');
    if (!email) addErr('Email', 'Bắt buộc');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) addErr('Email', 'Sai định dạng');
    if (!password) addErr('Mật khẩu', 'Bắt buộc');
    else if (password.length < 6) addErr('Mật khẩu', 'Phải ít nhất 6 ký tự');

    if (!role) addErr('Role', 'Bắt buộc');
    else if (!ALLOWED_ROLES.includes(role as Role)) addErr('Role', 'Chỉ cho phép STUDENT hoặc MANAGER');

    if (role === Role.STUDENT && email && !email.endsWith('@student.ptithcm.edu.vn')) {
      addErr('Email', 'Email sinh viên phải có đuôi @student.ptithcm.edu.vn');
    }
    if (role === Role.MANAGER && email && !email.endsWith('@ptithcm.edu.vn')) {
      addErr('Email', 'Email cán bộ phải có đuôi @ptithcm.edu.vn');
    }

    let gender = Gender.MALE;
    if (role === Role.STUDENT) {
      if (!fullName) addErr('Họ và tên', 'Bắt buộc với sinh viên');
      if (genderStr === 'Nam') gender = Gender.MALE;
      else if (genderStr === 'Nữ') gender = Gender.FEMALE;
      else addErr('Giới tính', 'Phải là "Nam" hoặc "Nữ"');
      if (!className) addErr('Lớp', 'Bắt buộc với sinh viên');
      if (!major) addErr('Ngành', 'Bắt buộc với sinh viên');
      if (!academicYear) addErr('Khóa', 'Bắt buộc với sinh viên');
      if (!department) addErr('Khoa', 'Bắt buộc với sinh viên');
    }

    if (username && seenUsernames.has(username)) addErr('Username', 'Trùng trong file');
    if (email && seenEmails.has(email)) addErr('Email', 'Trùng trong file');
    seenUsernames.add(username);
    seenEmails.add(email);

    if (!errors.some(e => e.row === rowNum)) {
      rows.push({ row: rowNum, username, fullName, gender, email, password, role, className, major, academicYear, department, isFreshman: false });
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    throw new AppError(400, 'File Excel không có dữ liệu', ErrorCode.EXCEL_INVALID_FORMAT);
  }

  if (errors.length > 0) {
    return { totalRows: rows.length + errors.length, successRows: 0, failedRows: errors.length, errors };
  }

  const existingUsers = await User.find({
    $or: [
      { username: { $in: rows.map(r => r.username) } },
      { email: { $in: rows.map(r => r.email) } },
    ],
  }).lean();

  for (const row of rows) {
    const dup = existingUsers.find(u => u.username === row.username || u.email === row.email);
    if (dup) {
      errors.push({
        row: row.row,
        field: dup.username === row.username ? 'Username' : 'Email',
        message: `Đã tồn tại trong hệ thống`,
      });
    }
  }

  if (errors.length > 0) {
    return { totalRows: rows.length, successRows: 0, failedRows: errors.length, errors };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const row of rows) {
      const passwordHash = await bcrypt.hash(row.password, 12);
      const [user] = await User.create([{
        username: row.username,
        email: row.email,
        passwordHash,
        role: row.role,
        status: UserStatus.INACTIVE,
        forcePasswordChange: row.role === Role.STUDENT,
      }], { session });

      if (row.role === Role.STUDENT) {
        await Student.create([{
          userId: user._id,
          studentCode: row.username,
          fullName: row.fullName,
          email: row.email,
          gender: row.gender,
          department: row.department,
          academicYear: row.academicYear,
          className: row.className,
          major: row.major,
          residenceType: ResidenceType.NOT_RESIDING,
          isFreshman: row.isFreshman,
        }], { session });
      }
    }

    await session.commitTransaction();
    return { totalRows: rows.length, successRows: rows.length, failedRows: 0, errors: [] };
  } catch (err) {
    await session.abortTransaction();
    throw new AppError(500, `Import thất bại: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`, ErrorCode.EXCEL_IMPORT_ROLLED_BACK);
  } finally {
    session.endSession();
  }
}

export async function generateImportTemplate(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');

  sheet.columns = [
    { header: 'Username (Mã SV)', key: 'username', width: 20 },
    { header: 'Họ và tên', key: 'fullName', width: 25 },
    { header: 'Giới tính', key: 'gender', width: 10 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Mật khẩu', key: 'password', width: 20 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Lớp', key: 'className', width: 15 },
    { header: 'Ngành', key: 'major', width: 25 },
    { header: 'Khóa', key: 'academicYear', width: 10 },
    { header: 'Khoa', key: 'department', width: 25 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4FF' } };

  sheet.addRow({ username: 'N24DCCN001', fullName: 'Nguyễn Văn A', gender: 'Nam', email: 'n24dccn001@student.ptithcm.edu.vn', password: 'student123', role: 'STUDENT', className: 'D24CQCN01-N', major: 'Công nghệ thông tin', academicYear: 'D24', department: 'Công nghệ thông tin' });
  sheet.addRow({ username: 'nguyenvana', fullName: 'Nguyễn Văn A', gender: 'Nam', email: 'nguyenvana@ptithcm.edu.vn', password: 'manager123', role: 'MANAGER', className: '', major: '', academicYear: '', department: '' });

  return await workbook.xlsx.writeBuffer();
}
