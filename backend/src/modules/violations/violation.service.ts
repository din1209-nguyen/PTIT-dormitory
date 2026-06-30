import { Violation } from '../../models/violation.model.js';
import { Student } from '../../models/student.model.js';
import { Notification } from '../../models/notification.model.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { NotificationScope, NotificationType, AuditAction, ViolationStatus } from '../../common/constants/enums.js';
import { logActivity } from '../../common/utils/auditLogger.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

export async function create(data: Record<string, unknown>, createdBy: string) {
  const student = await Student.findById(data.studentId);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  data.status = data.penalty ? ViolationStatus.RESOLVED : ViolationStatus.RECORDED;

  const violation = await Violation.create({ ...data, createdBy });
  logActivity({ userId: createdBy, action: AuditAction.VIOLATION_CREATE, entityName: 'Violation', entityId: violation._id.toString(), description: `Tạo vi phạm cho SV ${student.studentCode}` });

  const notif = await Notification.create({
    title: 'Vi phạm mới',
    content: `Bạn đã bị ghi nhận vi phạm: ${data.description}`,
    scope: NotificationScope.PRIVATE,
    type: NotificationType.VIOLATION,
    createdBy,
  });
  await NotificationReceiver.create({ notificationId: notif._id, studentId: data.studentId });

  return violation;
}

export async function list(pagination: PaginationQuery, filters: { studentId?: string; semesterId?: string; status?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.studentId) query.studentId = filters.studentId;
  if (filters.semesterId) query.semesterId = filters.semesterId;
  if (filters.status) query.status = filters.status;

  const [items, totalItems] = await Promise.all([
    Violation.find(query)
      .populate('studentId', 'studentCode fullName gender email phone className major department academicYear residenceType')
      .populate('semesterId', 'name')
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Violation.countDocuments(query),
  ]);

  return { items, pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) } };
}

export async function getByStudent(studentId: string) {
  return Violation.find({ studentId }).populate('semesterId', 'name').sort({ violationDate: -1 }).lean();
}

export async function getMyViolations(userId: string) {
  const student = await Student.findOne({ userId });
  if (!student) return [];
  return Violation.find({ studentId: student._id }).populate('semesterId', 'name').sort({ violationDate: -1 }).lean();
}

export async function update(id: string, data: Record<string, unknown>) {
  if (data.status !== ViolationStatus.CANCELLED) {
    data.status = data.penalty ? ViolationStatus.RESOLVED : ViolationStatus.RECORDED;
  }
  const violation = await Violation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!violation) throw new NotFoundError('Không tìm thấy vi phạm', ErrorCode.INTERNAL_SERVER_ERROR);
  return violation;
}
