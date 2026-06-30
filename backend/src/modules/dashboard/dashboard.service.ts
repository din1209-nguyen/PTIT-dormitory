import { Student } from '../../models/student.model.js';
import { User } from '../../models/user.model.js';
import { Permission } from '../../models/permission.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../../models/roomAssignment.model.js';
import { UtilityBillMember } from '../../models/utilityBillMember.model.js';
import { Notification } from '../../models/notification.model.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { ActivityLog } from '../../models/activityLog.model.js';
import { Semester } from '../../models/semester.model.js';
import { SemesterStatus, BillMemberStatus, NotificationScope } from '../../common/constants/enums.js';

// Tổng hợp số liệu dashboard dành cho admin
export async function getAdminStats() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalUsers, activeUsers, totalPermissions, recentLogs] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'ACTIVE' }),
    Permission.countDocuments(),
    ActivityLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  return { totalUsers, activeUsers, totalPermissions, recentLogs };
}

// Tổng hợp số liệu dashboard dành cho sinh viên
export async function getStudentStats(userId: string) {
  const student = await Student.findOne({ userId }).lean();
  if (!student) return { currentRoom: null, unreadNotifications: 0, unpaidBills: 0 };

  const activeSemester = await Semester.findOne({ status: SemesterStatus.ACTIVE }).select('_id').lean();

  const assignmentQuery: Record<string, unknown> = { studentId: student._id, status: RoomAssignmentStatus.ACTIVE };
  if (activeSemester) assignmentQuery.semesterId = activeSemester._id;

  const [assignment, unpaidBills] = await Promise.all([
    RoomAssignment.findOne(assignmentQuery).select('roomSnapshot').lean(),
    UtilityBillMember.countDocuments({ studentId: student._id, status: BillMemberStatus.UNPAID }),
  ]);

  const generalNotifs = await Notification.find({ scope: NotificationScope.GENERAL }).select('_id').lean();
  const readReceivers = await NotificationReceiver.find({
    studentId: student._id,
    notificationId: { $in: generalNotifs.map((n) => n._id) },
    isRead: true,
  }).select('notificationId').lean();
  const unreadGeneral = generalNotifs.length - readReceivers.length;
  const unreadPrivate = await NotificationReceiver.countDocuments({
    studentId: student._id,
    isRead: false,
    notificationId: { $nin: generalNotifs.map((n) => n._id) },
  });

  const roomSnap = assignment?.roomSnapshot as { buildingName?: string; roomNumber?: string } | undefined;
  const currentRoom = roomSnap ? `${roomSnap.buildingName || ''}${roomSnap.roomNumber || ''}` : null;

  return { currentRoom, unreadNotifications: unreadGeneral + unreadPrivate, unpaidBills };
}
