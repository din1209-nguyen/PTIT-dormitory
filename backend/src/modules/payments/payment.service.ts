import crypto from 'crypto';
import mongoose from 'mongoose';
import { Payment } from '../../models/payment.model.js';
import { UtilityBill } from '../../models/utilityBill.model.js';
import { UtilityBillMember } from '../../models/utilityBillMember.model.js';
import { Student } from '../../models/student.model.js';
import { Notification } from '../../models/notification.model.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { AppError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { BillStatus, BillMemberStatus, PaymentMethod, PaymentStatus, NotificationScope, NotificationType, AuditAction } from '../../common/constants/enums.js';
import { logActivity } from '../../common/utils/auditLogger.js';
import { env } from '../../config/env.js';
import { createPaymentUrl } from '../../integrations/vnpay/vnpay.client.js';
import { verifySecureHash } from '../../integrations/vnpay/vnpay.signature.js';

export async function createVnpayPayment(
  data: { billId: string; billMemberId?: string },
  userId: string,
  ipAddr: string,
) {
  if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET || !env.VNPAY_URL || !env.VNPAY_RETURN_URL) {
    throw new AppError(503, 'VNPay chưa được cấu hình', ErrorCode.INTERNAL_SERVER_ERROR);
  }

  const student = await Student.findOne({ userId });
  if (!student) throw new AppError(404, 'Không tìm thấy hồ sơ sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  const bill = await UtilityBill.findById(data.billId);
  if (!bill) throw new AppError(404, 'Hóa đơn không tồn tại', ErrorCode.BILL_NOT_FOUND);
  if (bill.status === BillStatus.PAID) throw new AppError(400, 'Hóa đơn đã được thanh toán', ErrorCode.VALIDATION_ERROR);
  if (bill.status === BillStatus.CANCELLED) throw new AppError(400, 'Hóa đơn đã bị hủy', ErrorCode.VALIDATION_ERROR);

  const billMember = await UtilityBillMember.findOne({ billId: data.billId, studentId: student._id });
  if (!billMember) throw new AppError(403, 'Bạn không thuộc hóa đơn này', ErrorCode.AUTH_FORBIDDEN);
  if (billMember.status === BillMemberStatus.PAID) throw new AppError(400, 'Bạn đã thanh toán hóa đơn này', ErrorCode.VALIDATION_ERROR);

  const vnpTxnRef = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const amount = Math.round(bill.totalCost);

  const payment = await Payment.create({
    billId: bill._id,
    studentId: student._id,
    method: PaymentMethod.VNPAY,
    amount,
    status: PaymentStatus.PENDING,
    vnpTxnRef,
  });

  const paymentUrl = createPaymentUrl({
    amount,
    orderId: vnpTxnRef,
    orderInfo: `Thanh toan hoa don dien nuoc thang ${bill.month}/${bill.year}`,
    ipAddr,
  });

  return { paymentUrl, paymentId: payment._id };
}

export async function handleVnpayIpn(query: Record<string, string>) {
  if (!env.VNPAY_HASH_SECRET) {
    return { RspCode: '99', Message: 'VNPay not configured' };
  }

  if (!verifySecureHash(query, env.VNPAY_HASH_SECRET)) {
    return { RspCode: '97', Message: 'Invalid Checksum' };
  }

  const payment = await Payment.findOne({ vnpTxnRef: query.vnp_TxnRef });
  if (!payment) {
    return { RspCode: '01', Message: 'Order not found' };
  }

  const receivedAmount = Number(query.vnp_Amount) / 100;
  if (payment.amount !== receivedAmount) {
    if (!(receivedAmount === 10000 && payment.amount < 10000)) {
      return { RspCode: '04', Message: 'Invalid Amount' };
    }
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return { RspCode: '02', Message: 'Already processed' };
  }

  payment.vnpTransactionNo = query.vnp_TransactionNo;
  payment.vnpResponseCode = query.vnp_ResponseCode;
  payment.vnpPayDate = query.vnp_PayDate;
  payment.vnpSecureHash = query.vnp_SecureHash;
  payment.vnpRawData = query;

  if (query.vnp_ResponseCode === '00') {
    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    await payment.save();

    await UtilityBillMember.updateMany(
      { billId: payment.billId },
      { status: BillMemberStatus.PAID, paidAt: new Date() },
    );

    await checkAndUpdateBillStatus(payment.billId.toString());
  } else {
    payment.status = PaymentStatus.FAILED;
    await payment.save();
  }

  return { RspCode: '00', Message: 'Confirm Success' };
}

export async function handleVnpayReturn(query: Record<string, string>) {
  // Chạy logic IPN để fallback cho trường hợp dev ở localhost
  await handleVnpayIpn(query).catch(console.error);
  
  const success = query.vnp_ResponseCode === '00';
  return { success, txnRef: query.vnp_TxnRef || '' };
}

export async function checkStatus(txnRef: string) {
  const payment = await Payment.findOne({ vnpTxnRef: txnRef })
    .populate('billId', 'month year totalCost roomId')
    .lean();
  if (!payment) throw new AppError(404, 'Giao dịch không tồn tại', ErrorCode.PAYMENT_NOT_FOUND);
  return payment;
}

export async function confirmCashPayment(
  data: { billId: string; studentId: string },
  confirmedBy: string,
) {
  const bill = await UtilityBill.findById(data.billId);
  if (!bill) throw new AppError(404, 'Hóa đơn không tồn tại', ErrorCode.BILL_NOT_FOUND);
  if (bill.status === BillStatus.PAID) throw new AppError(400, 'Hóa đơn đã được thanh toán', ErrorCode.UTILITY_BILL_ALREADY_PAID);
  if (bill.status === BillStatus.CANCELLED) throw new AppError(400, 'Hóa đơn đã bị hủy', ErrorCode.VALIDATION_ERROR);

  const billMember = await UtilityBillMember.findOne({ billId: data.billId, studentId: data.studentId });
  if (!billMember) throw new AppError(404, 'Sinh viên không thuộc hóa đơn này', ErrorCode.STUDENT_NOT_FOUND);
  if (billMember.status === BillMemberStatus.PAID) throw new AppError(400, 'Sinh viên đã thanh toán', ErrorCode.VALIDATION_ERROR);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.create(
      [{
        billId: bill._id,
        studentId: data.studentId,
        method: PaymentMethod.CASH,
        amount: bill.totalCost,
        status: PaymentStatus.SUCCESS,
        cashConfirmedBy: confirmedBy,
        paidAt: new Date(),
      }],
      { session },
    );

    await UtilityBillMember.updateMany(
      { billId: data.billId },
      { status: BillMemberStatus.PAID, paidAt: new Date() },
      { session },
    );

    await checkAndUpdateBillStatus(data.billId, session);

    await session.commitTransaction();

    // Notification outside transaction
    const notif = await Notification.create({
      title: 'Xác nhận thanh toán tiền mặt',
      content: `Hóa đơn điện nước tháng ${bill.month}/${bill.year} đã được xác nhận thanh toán bằng tiền mặt.`,
      scope: NotificationScope.PRIVATE,
      type: NotificationType.BILL,
      createdBy: confirmedBy,
    });
    await NotificationReceiver.create({ notificationId: notif._id, studentId: data.studentId });

    logActivity({ userId: confirmedBy, action: AuditAction.PAYMENT_CASH_CONFIRM, entityName: 'Payment', entityId: payment[0]._id.toString(), description: `Xác nhận thanh toán tiền mặt hóa đơn T${bill.month}/${bill.year}` });

    return payment[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function getPaymentsByBill(billId: string) {
  return Payment.find({ billId })
    .populate('studentId', 'studentCode fullName')
    .populate('cashConfirmedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();
}

async function checkAndUpdateBillStatus(billId: string, session?: mongoose.ClientSession) {
  const unpaidCount = await UtilityBillMember.countDocuments(
    { billId, status: { $ne: BillMemberStatus.PAID } },
    session ? { session } : {},
  );

  if (unpaidCount === 0) {
    const updateOpts = session ? { session } : {};
    await UtilityBill.findByIdAndUpdate(
      billId,
      { status: BillStatus.PAID, paymentDate: new Date() },
      updateOpts,
    );
  }
}
