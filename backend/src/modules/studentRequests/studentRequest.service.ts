import { StudentRequest } from '../../models/studentRequest.model.js';
import { Notification } from '../../models/notification.model.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { NotificationScope, NotificationType, RequestStatus } from '../../common/constants/enums.js';
import { NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';
import type { Types } from 'mongoose';

export async function createRequest(
  studentId: string,
  data: { type: string; title: string; content: string },
) {
  return StudentRequest.create({
    studentId,
    type: data.type,
    title: data.title,
    content: data.content,
    status: RequestStatus.PENDING,
  });
}

export async function getMyRequests(studentId: string) {
  return StudentRequest.find({ studentId }).sort({ createdAt: -1 }).lean();
}

export async function listAll(
  filters: { type?: string; status?: string },
  pagination: PaginationQuery,
) {
  const query: Record<string, unknown> = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  const [items, totalItems] = await Promise.all([
    StudentRequest.find(query)
      .populate('studentId', 'studentCode fullName gender email phone className major department academicYear residenceType')
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    StudentRequest.countDocuments(query),
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

export async function getById(id: string) {
  const request = await StudentRequest.findById(id)
    .populate('studentId', 'studentCode fullName gender email phone className major department academicYear residenceType')
    .lean();
  if (!request) throw new NotFoundError('Không tìm thấy đơn từ', ErrorCode.INTERNAL_SERVER_ERROR);
  return request;
}

export async function updateStatus(
  id: string,
  data: { status: string; managerNote?: string },
  processedBy: string,
) {
  const request = await StudentRequest.findById(id);
  if (!request) throw new NotFoundError('Không tìm thấy đơn từ', ErrorCode.INTERNAL_SERVER_ERROR);

  request.status = data.status as RequestStatus;
  request.processedBy = processedBy as unknown as Types.ObjectId;
  request.processedAt = new Date();
  if (data.managerNote !== undefined) {
    request.managerNote = data.managerNote;
  }
  await request.save();

  // Create a private notification for the student about the status change
  const statusLabel =
    data.status === 'RESOLVED' ? 'Đã giải quyết' :
    data.status === 'REJECTED' ? 'Đã từ chối' :
    'Đang xử lý';

  const notification = await Notification.create({
    title: `Yêu cầu "${request.title}" - ${statusLabel}`,
    content: data.managerNote || `Yêu cầu của bạn đã được cập nhật trạng thái: ${statusLabel}`,
    scope: NotificationScope.PRIVATE,
    type: NotificationType.APPROVAL_STATUS,
    createdBy: processedBy,
  });

  await NotificationReceiver.create({
    notificationId: notification._id as Types.ObjectId,
    studentId: request.studentId,
    isRead: false,
  });

  return request;
}
