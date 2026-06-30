import { Notification } from '../../models/notification.model.js';
import { sendEmail } from '../../common/services/email.service.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { NotificationScope, NotificationType } from '../../common/constants/enums.js';
import { Student } from '../../models/student.model.js';
import { Semester } from '../../models/semester.model.js';
import type { Types } from 'mongoose';

export async function createGeneral(
  data: { title: string; content: string; type?: string },
  createdBy: string,
) {
  return Notification.create({
    title: data.title,
    content: data.content,
    type: data.type,
    scope: NotificationScope.GENERAL,
    createdBy,
  });
}

export async function createPrivate(
  data: { title: string; content: string; type?: string; studentIds: string[] },
  createdBy: string,
) {
  const notification = await Notification.create({
    title: data.title,
    content: data.content,
    type: data.type,
    scope: NotificationScope.PRIVATE,
    createdBy,
  });

  const receivers = data.studentIds.map((studentId) => ({
    notificationId: notification._id as Types.ObjectId,
    studentId,
    isRead: false,
  }));

  await NotificationReceiver.insertMany(receivers);

  // Send emails asynchronously without blocking
  const activeSemester = await Semester.findOne({ status: 'ACTIVE' }).lean();
  let semesterInfoHtml = '';
  if (activeSemester) {
    const startDate = new Date(activeSemester.startDate).toLocaleDateString('vi-VN');
    const endDate = new Date(activeSemester.endDate).toLocaleDateString('vi-VN');
    semesterInfoHtml = `<div style="margin-top: 15px; padding: 10px; background-color: #f1f5f9; border-radius: 4px; font-size: 13px; color: #475569;"><strong>Kỳ lưu trú hiện tại:</strong> ${activeSemester.name} (${startDate} - ${endDate})</div>`;
  }

  Student.find({ _id: { $in: data.studentIds } })
    .select('email fullName')
    .lean()
    .then((students) => {
      students.forEach((student) => {
        if (student.email) {
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto;">
              <h2 style="color: #0056b3;">Thông báo từ Ký túc xá PTIT</h2>
              <p>Chào ${student.fullName},</p>
              <p>Bạn có một thông báo cá nhân mới từ Ban quản lý:</p>
              <div style="padding: 15px; border-left: 4px solid #0056b3; background-color: #f9f9f9; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0056b3;">${data.title}</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${data.content}</p>
              </div>
              <p>Vui lòng đăng nhập vào hệ thống quản lý KTX để xem chi tiết.</p>
              ${semesterInfoHtml}
              <br/>
              <p>Trân trọng,<br/>Ban quản lý Ký túc xá PTIT</p>
            </div>
          `;
          sendEmail({
            to: student.email,
            subject: `[KTX PTIT] ${data.title}`,
            html: htmlContent,
          }).catch(console.error);
        }
      });
    })
    .catch((err) => console.error('Lỗi khi truy vấn email sinh viên:', err));

  return notification;
}

export async function listAll() {
  const notifications = await Notification.find({ type: NotificationType.GENERAL })
    .sort({ createdAt: -1 })
    .lean();

  const privateIds = notifications
    .filter((n) => n.scope === NotificationScope.PRIVATE)
    .map((n) => n._id);

  if (privateIds.length > 0) {
    const receivers = await NotificationReceiver.find({
      notificationId: { $in: privateIds },
    })
      .populate({
        path: 'studentId',
        model: Student,
        select: 'studentCode fullName gender email phone className major department academicYear residenceType',
      })
      .lean();

    const receiversMap = new Map<string, any[]>();
    for (const r of receivers) {
      const notifId = r.notificationId.toString();
      if (!receiversMap.has(notifId)) {
        receiversMap.set(notifId, []);
      }
      receiversMap.get(notifId)!.push(r);
    }

    return notifications.map((n) => {
      if (n.scope === NotificationScope.PRIVATE) {
        const recs = receiversMap.get(n._id.toString()) || [];
        return {
          ...n,
          students: recs.map((r) => r.studentId).filter(Boolean),
        };
      }
      return n;
    });
  }

  return notifications;
}

export async function getMyNotifications(studentId: string) {
  // 1. All GENERAL notifications
  const generalNotifications = await Notification.find({
    scope: NotificationScope.GENERAL,
  })
    .sort({ createdAt: -1 })
    .lean();

  // 2. All PRIVATE notifications for this student via receivers
  const privateReceivers = await NotificationReceiver.find({ studentId })
    .populate('notificationId')
    .lean();

  // 3. Get read status for general notifications
  const generalReceivers = await NotificationReceiver.find({
    studentId,
    notificationId: { $in: generalNotifications.map((n) => n._id) },
  }).lean();

  const readMap = new Map(
    generalReceivers.map((r) => [r.notificationId.toString(), r]),
  );

  // 4. Merge results
  const generalItems = generalNotifications.map((n) => {
    const receiver = readMap.get(n._id.toString());
    return {
      ...n,
      isRead: receiver?.isRead ?? false,
    };
  });

  const privateItems = privateReceivers
    .filter((r) => {
      const notif = r.notificationId as any;
      return notif && notif.scope === NotificationScope.PRIVATE;
    })
    .map((r) => {
      const notification = r.notificationId as unknown as Record<string, unknown>;
      return {
        ...notification,
        isRead: r.isRead,
      };
    });

  // 5. Merge and sort by createdAt desc
  const all = [...generalItems, ...privateItems].sort((a, b) => {
    const dateA = new Date((a as Record<string, unknown>).createdAt as string).getTime();
    const dateB = new Date((b as Record<string, unknown>).createdAt as string).getTime();
    return dateB - dateA;
  });

  return all;
}

export async function markRead(notificationId: string, studentId: string) {
  await NotificationReceiver.findOneAndUpdate(
    { notificationId, studentId },
    { isRead: true, readAt: new Date() },
    { upsert: true, new: true },
  );
}

export async function getUnreadCount(studentId: string) {
  // 1. Count general notifications that student hasn't read
  const generalNotifications = await Notification.find({
    scope: NotificationScope.GENERAL,
  })
    .select('_id')
    .lean();

  const readGeneralReceivers = await NotificationReceiver.find({
    studentId,
    notificationId: { $in: generalNotifications.map((n) => n._id) },
    isRead: true,
  })
    .select('notificationId')
    .lean();

  const readGeneralIds = new Set(
    readGeneralReceivers.map((r) => r.notificationId.toString()),
  );

  const unreadGeneralCount = generalNotifications.filter(
    (n) => !readGeneralIds.has(n._id.toString()),
  ).length;

  // 2. Count private unread notifications
  const unreadPrivateCount = await NotificationReceiver.countDocuments({
    studentId,
    isRead: false,
    notificationId: {
      $nin: generalNotifications.map((n) => n._id),
    },
  });

  return unreadGeneralCount + unreadPrivateCount;
}
