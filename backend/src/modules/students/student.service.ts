import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { Student } from '../../models/student.model.js';
import { User } from '../../models/user.model.js';
import { ResidenceRecord } from '../../models/residenceRecord.model.js';
import { SystemConfig, parseConfigValue } from '../../models/systemConfig.model.js';
import { AppError, NotFoundError, ValidationError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { Semester } from '../../models/semester.model.js';
import { SemesterStatus, ResidenceType, ResidenceStatus } from '../../common/constants/enums.js';
import { UserStatus } from '../../common/constants/statuses.js';
import { Role } from '../../common/constants/roles.js';
import { queueEmail } from '../../integrations/mail/mail.service.js';
import { newStudentRegistrationTemplate, returningStudentRegistrationTemplate } from '../../integrations/mail/mail.templates.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

const MAJORS = [
  { code: 'CN', name: 'Công nghệ thông tin', dept: 'Công nghệ thông tin' },
  { code: 'AT', name: 'An toàn thông tin', dept: 'Công nghệ thông tin' },
  { code: 'VT', name: 'Kỹ thuật điện tử viễn thông', dept: 'Viễn thông' },
  { code: 'DT', name: 'Kỹ thuật điện tử', dept: 'Kỹ thuật Điện tử' },
  { code: 'PT', name: 'Công nghệ đa phương tiện', dept: 'Đa phương tiện' },
  { code: 'KT', name: 'Kế toán', dept: 'Kế toán' },
  { code: 'QT', name: 'Quản trị kinh doanh', dept: 'Quản trị kinh doanh' },
  { code: 'MR', name: 'Marketing', dept: 'Quản trị kinh doanh' },
];

function sameText(a?: string, b?: string) {
  const normalize = (value?: string) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLocaleLowerCase('vi-VN');
  return normalize(a) === normalize(b);
}

function validateMajorCode(studentCode?: string, className?: string, major?: string, department?: string) {
  if (!major || !department) return;
  const majorObj = MAJORS.find((m) => sameText(m.name, major) && sameText(m.dept, department));
  if (!majorObj) return;

  if (studentCode) {
    const m = String(studentCode).match(/^[a-zA-Z]{1,2}\d{2}[a-zA-Z]{2}([a-zA-Z]{2})\d{3,4}$/);
    if (m && m[1] !== majorObj.code) {
      throw new ValidationError('Mã sinh viên không khớp', [{ field: 'studentCode', message: `Phải chứa mã ngành ${majorObj.code}` }]);
    }
  }
  if (className) {
    const m = String(className).match(/^[a-zA-Z]{1,2}\d{2}[a-zA-Z]{2}([a-zA-Z]{2})\d{2}-[a-zA-Z0-9]{1,2}$/);
    if (m && m[1] !== majorObj.code) {
      throw new ValidationError('Mã lớp không khớp', [{ field: 'className', message: `Phải chứa mã ngành ${majorObj.code}` }]);
    }
  }
}

export async function getStudentStats() {
  const [total, residing, pending, inactive] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ residenceType: ResidenceType.RESIDING }),
    Student.countDocuments({ residenceType: ResidenceType.PENDING_ROOM }),
    Student.countDocuments({ residenceType: ResidenceType.NOT_RESIDING })
  ]);
  return { total, residing, pending, inactive };
}

async function getFacultyList(): Promise<string[]> {
  const config = await SystemConfig.findOne({ configKey: 'faculty_list' });
  if (!config) return [];
  return parseConfigValue(config) as string[];
}

async function validateStudentBusinessData(data: Record<string, unknown>) {
  if (data.department) {
    const faculties = await getFacultyList();
    if (faculties.length > 0 && !faculties.some((f) => sameText(f, data.department as string))) {
      throw new ValidationError('Khoa không hợp lệ', [{ field: 'department', message: `Phải là một trong: ${faculties.join(', ')}` }]);
    }
  }

  validateMajorCode(
    data.studentCode as string | undefined,
    data.className as string | undefined,
    data.major as string | undefined,
    data.department as string | undefined,
  );
}

function deriveAcademicYear(studentCode?: string) {
  const match = String(studentCode || '').match(/^[a-zA-Z]{1,2}(\d{2})/);
  return match ? `D${match[1]}` : '';
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

async function getPreparingSemester(session?: ClientSession) {
  const semester = await Semester.findOne({ status: SemesterStatus.PREPARING }).sort({ startDate: 1 }).session(session || null);
  if (!semester) {
    throw new AppError(400, 'Không có kỳ lưu trú nào đang trong giai đoạn chuẩn bị', ErrorCode.SEMESTER_NOT_FOUND);
  }
  return semester;
}

async function getRegistrationSemester(semesterId?: string | Types.ObjectId, session?: ClientSession) {
  const semester = semesterId
    ? await Semester.findById(semesterId).session(session || null)
    : await Semester.findOne({ status: SemesterStatus.PREPARING }).sort({ startDate: 1 }).session(session || null)
      ?? await Semester.findOne({ status: SemesterStatus.ACTIVE }).sort({ startDate: -1 }).session(session || null);

  if (!semester) throw new AppError(400, 'Khong tim thay ky luu tru phu hop', ErrorCode.SEMESTER_NOT_FOUND);
  if (![SemesterStatus.PREPARING, SemesterStatus.ACTIVE].includes(semester.status)) {
    throw new AppError(400, 'Ky luu tru phai o trang thai PREPARING hoac ACTIVE', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  return semester;
}

interface StudentFilters {
  gender?: string;
  department?: string;
  residenceType?: string;
  academicYear?: string;
  isFreshman?: boolean;
}

export interface RegistrationEmailJob {
  recipientEmail: string;
  subject: string;
  content: string;
}

export interface RegisterStudentResult {
  student: NonNullable<Awaited<ReturnType<typeof Student.findOne>>>;
  isNewStudent: boolean;
  isNewAccount: boolean;
  emailJob: RegistrationEmailJob;
}

export async function queueRegistrationEmail(job: RegistrationEmailJob) {
  await queueEmail(job);
}

export async function registerStudentForPreparingSemester(
  data: Record<string, unknown>,
  options: { session?: ClientSession; semesterId?: string | Types.ObjectId } = {},
): Promise<RegisterStudentResult> {
  await validateStudentBusinessData(data);

  const session = options.session;
  const semester = options.semesterId
    ? await getRegistrationSemester(options.semesterId, session)
    : await getPreparingSemester(session);

  if (!semester) throw new AppError(400, 'Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (![SemesterStatus.PREPARING, SemesterStatus.ACTIVE].includes(semester.status)) {
    throw new AppError(400, 'Ky luu tru phai o trang thai PREPARING hoac ACTIVE', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  const studentCode = String(data.studentCode || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  if (!studentCode) throw new ValidationError('Mã sinh viên là bắt buộc', [{ field: 'studentCode', message: 'Bắt buộc' }]);
  if (!email) throw new ValidationError('Email là bắt buộc', [{ field: 'email', message: 'Bắt buộc' }]);

  const academicYear = String(data.academicYear || deriveAcademicYear(studentCode));
  const existingByEmail = await Student.findOne({ email }).session(session || null);
  let student = await Student.findOne({ studentCode }).session(session || null);

  if (existingByEmail && (!student || existingByEmail._id.toString() !== student._id.toString())) {
    throw new AppError(409, 'Email đã tồn tại ở sinh viên khác', ErrorCode.VALIDATION_ERROR, [{ field: 'email', message: 'Đã được sử dụng' }]);
  }

  let isNewStudent = false;
  let isNewAccount = false;
  let temporaryPassword: string | undefined;

  if (!student) {
    const existingUser = await User.findOne({ $or: [{ username: studentCode }, { email }] }).session(session || null);
    if (existingUser) {
      throw new AppError(409, 'Tài khoản đã tồn tại nhưng chưa gắn đúng hồ sơ sinh viên', ErrorCode.VALIDATION_ERROR);
    }

    temporaryPassword = generateTemporaryPassword();
    const [user] = await User.create([{
      username: studentCode,
      email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      role: Role.STUDENT,
      status: UserStatus.INACTIVE,
      forcePasswordChange: true,
    }], { session });

    const [createdStudent] = await Student.create([{
      userId: user._id,
      studentCode,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email,
      phone: data.phone,
      address: data.address,
      className: data.className,
      major: data.major,
      department: data.department,
      academicYear,
      isFreshman: data.isFreshman ?? false,
      residenceType: ResidenceType.PENDING_ROOM,
    }], { session });

    student = createdStudent;
    isNewStudent = true;
    isNewAccount = true;
  } else {
    if (!student.userId) {
      const existingUser = await User.findOne({ $or: [{ username: studentCode }, { email }] }).session(session || null);
      if (existingUser && existingUser.role !== Role.STUDENT) {
        throw new AppError(409, 'Email hoặc username đã thuộc tài khoản không phải sinh viên', ErrorCode.VALIDATION_ERROR);
      }

      if (existingUser) {
        student.userId = existingUser._id;
      } else {
        temporaryPassword = generateTemporaryPassword();
        const [user] = await User.create([{
          username: studentCode,
          email,
          passwordHash: await bcrypt.hash(temporaryPassword, 12),
          role: Role.STUDENT,
          status: UserStatus.INACTIVE,
          forcePasswordChange: true,
        }], { session });
        student.userId = user._id;
        isNewAccount = true;
      }
    } else {
      const existingUserWithEmail = await User.findOne({ email }).session(session || null);
      if (existingUserWithEmail && existingUserWithEmail._id.toString() !== student.userId.toString()) {
        throw new AppError(409, 'Email đã thuộc tài khoản khác', ErrorCode.VALIDATION_ERROR, [{ field: 'email', message: 'Đã được sử dụng' }]);
      }
      await User.findByIdAndUpdate(student.userId, { email }, { session });
    }

    student.fullName = String(data.fullName || student.fullName);
    student.email = email;
    student.gender = data.gender as typeof student.gender;
    student.className = data.className as string | undefined;
    student.major = data.major as string | undefined;
    student.department = data.department as string | undefined;
    student.academicYear = academicYear;
    student.isFreshman = Boolean(data.isFreshman ?? student.isFreshman);
    student.residenceType = ResidenceType.PENDING_ROOM;
    await student.save({ session });
  }

  const existingRecord = await ResidenceRecord.findOne({ studentId: student._id, semesterId: semester._id }).session(session || null);
  if (existingRecord) {
    throw new AppError(409, 'Sinh viên đã có trong danh sách chờ của kỳ này', ErrorCode.VALIDATION_ERROR, [{ field: 'studentCode', message: 'Đã đăng ký kỳ này' }]);
  }

  await ResidenceRecord.create([{
    studentId: student._id,
    semesterId: semester._id,
    startDate: semester.startDate,
    registeredAt: data.registeredAt instanceof Date ? data.registeredAt : new Date(),
    status: semester.status === SemesterStatus.ACTIVE ? ResidenceStatus.ACTIVE : ResidenceStatus.PREPARING,
  }], { session });

  const template = isNewAccount && temporaryPassword
    ? newStudentRegistrationTemplate({
      studentName: student.fullName,
      studentCode,
      password: temporaryPassword,
      semesterName: semester.name,
    })
    : returningStudentRegistrationTemplate({
      studentName: student.fullName,
      studentCode,
      semesterName: semester.name,
    });

  return {
    student,
    isNewStudent,
    isNewAccount,
    emailJob: {
      recipientEmail: student.email,
      subject: template.subject,
      content: template.html,
    },
  };
}

export async function listStudents(pagination: PaginationQuery, filters: StudentFilters) {
  const query: Record<string, unknown> = {};
  if (filters.gender) query.gender = filters.gender;
  if (filters.department) query.department = filters.department;
  if (filters.residenceType) query.residenceType = filters.residenceType;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.isFreshman !== undefined) query.isFreshman = filters.isFreshman;

  if (pagination.keyword) {
    query.$or = [
      { studentCode: { $regex: pagination.keyword, $options: 'i' } },
      { fullName: { $regex: pagination.keyword, $options: 'i' } },
      { email: { $regex: pagination.keyword, $options: 'i' } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    Student.find(query)
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Student.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / pagination.limit),
    },
  };
}

export async function getStudentById(id: string) {
  const student = await Student.findById(id).lean();
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);
  return student;
}

export async function createStudent(data: Record<string, unknown>) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await registerStudentForPreparingSemester(data, { session });
    await session.commitTransaction();
    await queueRegistrationEmail(result.emailJob);
    return result.student;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function updateStudent(id: string, data: Record<string, unknown>) {
  const student = await Student.findById(id);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  await validateStudentBusinessData({ ...student.toObject(), ...data });

  if (data.studentCode) {
    const academicYear = deriveAcademicYear(String(data.studentCode));
    if (academicYear) data.academicYear = academicYear;
  }

  if (data.studentCode && data.studentCode !== student.studentCode) {
    const dup = await Student.findOne({ studentCode: data.studentCode });
    if (dup) throw new AppError(409, 'Mã sinh viên đã tồn tại', ErrorCode.VALIDATION_ERROR, [{ field: 'studentCode', message: 'Đã được sử dụng' }]);
  }

  Object.assign(student, data);
  await student.save();
  return student;
}

export async function getResidenceHistory(studentId: string) {
  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  return ResidenceRecord.find({ studentId })
    .populate('semesterId')
    .sort({ createdAt: -1 })
    .lean();
}

export async function addToWaitingList(studentId: string, semesterId?: string) {
  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  if (student.residenceType !== ResidenceType.NOT_RESIDING) {
    throw new AppError(400, 'Sinh viên đang ở trạng thái không hợp lệ để thêm vào danh sách chờ', ErrorCode.VALIDATION_ERROR);
  }

  const semester = await getRegistrationSemester(semesterId);
  const existingRecord = await ResidenceRecord.findOne({ studentId: student._id, semesterId: semester._id });
  if (existingRecord) {
    throw new AppError(409, 'Sinh viên đã có trong danh sách chờ của kỳ này', ErrorCode.VALIDATION_ERROR);
  }

  await ResidenceRecord.create({
    studentId: student._id,
    semesterId: semester._id,
    startDate: semester.startDate,
    registeredAt: new Date(),
    status: semester.status === SemesterStatus.ACTIVE ? ResidenceStatus.ACTIVE : ResidenceStatus.PREPARING,
  });

  student.residenceType = ResidenceType.PENDING_ROOM;
  await student.save();

  return student;
}
