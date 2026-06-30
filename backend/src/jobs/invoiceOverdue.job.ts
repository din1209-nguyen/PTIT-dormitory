import { UtilityBill } from '../models/utilityBill.model.js';
import { UtilityBillMember } from '../models/utilityBillMember.model.js';
import { Notification } from '../models/notification.model.js';
import { NotificationReceiver } from '../models/notificationReceiver.model.js';
import { BillStatus, NotificationScope, NotificationType } from '../common/constants/enums.js';
import { logger } from '../config/logger.js';

export async function runInvoiceOverdue() {
  try {
    const overdueBills = await UtilityBill.find({
      status: BillStatus.UNPAID,
      dueDate: { $lt: new Date() },
    });

    if (overdueBills.length === 0) return;

    for (const bill of overdueBills) {
      bill.status = BillStatus.OVERDUE;
      await bill.save();

      const members = await UtilityBillMember.find({ billId: bill._id }).select('studentId').lean();
      if (members.length > 0) {
        const notif = await Notification.create({
          title: 'Hóa đơn quá hạn',
          content: `Hóa đơn điện nước tháng ${bill.month}/${bill.year} đã quá hạn thanh toán. Vui lòng thanh toán ngay.`,
          scope: NotificationScope.PRIVATE,
          type: NotificationType.BILL,
        });
        await NotificationReceiver.insertMany(
          members.map((m) => ({ notificationId: notif._id, studentId: m.studentId })),
        );
      }
    }

    logger.info(`[Job] Marked ${overdueBills.length} bills as overdue`);
  } catch (err) {
    logger.error('[Job] Invoice overdue check failed', { error: err });
  }
}
