import mongoose from 'mongoose';
import { UtilityUsage } from '../../models/utilityUsage.model.js';
import { UtilityBill } from '../../models/utilityBill.model.js';
import { UtilityBillMember } from '../../models/utilityBillMember.model.js';
import { ElectricPriceTier, type IElectricPriceTier } from '../../models/electricPriceTier.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../../models/roomAssignment.model.js';
import { Semester } from '../../models/semester.model.js';
import { Student } from '../../models/student.model.js';
import { Room } from '../../models/room.model.js';
import { SystemConfig, parseConfigValue } from '../../models/systemConfig.model.js';
import { Notification } from '../../models/notification.model.js';
import { NotificationReceiver } from '../../models/notificationReceiver.model.js';
import { AppError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { BillStatus, BillMemberStatus, SemesterStatus, NotificationScope, NotificationType, AuditAction } from '../../common/constants/enums.js';
import { logActivity } from '../../common/utils/auditLogger.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

interface TierData {
  tierOrder: number;
  fromKwh: number;
  toKwh: number | null;
  unitPrice: number;
}

export function calculateElectricityCost(
  kwhUsage: number,
  tiers: TierData[],
  vatRate: number,
): { electricBeforeVat: number; vatAmount: number; electricityCost: number } {
  let electricBeforeVat = 0;
  let remaining = kwhUsage;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierRange = tier.toKwh !== null ? tier.toKwh - tier.fromKwh : remaining;
    const kwhInTier = Math.min(remaining, tierRange);
    electricBeforeVat += kwhInTier * tier.unitPrice;
    remaining -= kwhInTier;
  }

  electricBeforeVat = Math.round(electricBeforeVat);
  const vatAmount = Math.round(electricBeforeVat * vatRate);
  const electricityCost = electricBeforeVat + vatAmount;

  return { electricBeforeVat, vatAmount, electricityCost };
}

export function calculateWaterCost(usage: number, freeQuota: number, unitPrice: number): number {
  return Math.round(Math.max(usage - freeQuota, 0) * unitPrice);
}

async function loadBillingConfigs() {
  const keys = ['free_water_quota', 'water_unit_price', 'electric_vat_rate', 'water_vat_rate', 'wastewater_fee_rate', 'payment_due_days'];
  const configs = await SystemConfig.find({ configKey: { $in: keys } }).lean();

  const map: Record<string, number> = {};
  for (const cfg of configs) {
    map[cfg.configKey] = parseConfigValue(cfg) as number;
  }

  return {
    freeWaterQuota: map.free_water_quota ?? 3,
    waterUnitPrice: map.water_unit_price ?? 8500,
    electricVatRate: map.electric_vat_rate ?? 0.1,
    waterVatRate: map.water_vat_rate ?? 0.05,
    wastewaterFeeRate: map.wastewater_fee_rate ?? 0.1,
    paymentDueDays: map.payment_due_days ?? 10,
  };
}

export async function generateBills(month: number, year: number, createdBy: string) {
  const usages = await UtilityUsage.find({ month, year }).lean();
  if (usages.length === 0) {
    throw new AppError(400, 'Không có chỉ số điện nước nào cho tháng/năm này', ErrorCode.VALIDATION_ERROR);
  }

  const existingBills = await UtilityBill.find({ month, year, status: { $ne: BillStatus.CANCELLED } }).lean();
  const billedRoomIds = new Set(existingBills.map(b => b.roomId.toString()));

  const unbilledUsages = usages.filter(u => !billedRoomIds.has(u.roomId.toString()));

  if (unbilledUsages.length === 0) {
    throw new AppError(400, 'Tất cả các phòng ghi chỉ số trong tháng này đã được lập hóa đơn', ErrorCode.VALIDATION_ERROR);
  }

  const activeSemester = await Semester.findOne({ status: SemesterStatus.ACTIVE }).lean();
  const tiers = await ElectricPriceTier.find({ isActive: true }).sort({ tierOrder: 1 }).lean();
  if (tiers.length === 0) {
    throw new AppError(400, 'Chưa cấu hình bậc giá điện', ErrorCode.VALIDATION_ERROR);
  }

  const billingConfig = await loadBillingConfigs();
  const tierData: TierData[] = tiers.map((t) => ({
    tierOrder: t.tierOrder, fromKwh: t.fromKwh, toKwh: t.toKwh, unitPrice: t.unitPrice,
  }));

  const session = await mongoose.startSession();
  session.startTransaction();

  const createdBills: Array<{ roomId: string; totalCost: number; memberCount: number }> = [];
  const notifyStudentIds: string[] = [];

  try {
    for (const usage of unbilledUsages) {
      const electricityUsage = usage.newElectricity - usage.oldElectricity;
      const waterUsage = usage.newWater - usage.oldWater;

      const { electricBeforeVat, vatAmount: electricVatAmount, electricityCost } = calculateElectricityCost(electricityUsage, tierData, billingConfig.electricVatRate);
      const waterBeforeTax = calculateWaterCost(waterUsage, billingConfig.freeWaterQuota, billingConfig.waterUnitPrice);
      const wastewaterFee = Math.round(waterBeforeTax * billingConfig.wastewaterFeeRate);
      const waterVatAmount = Math.round(waterBeforeTax * billingConfig.waterVatRate);
      const waterCost = waterBeforeTax + wastewaterFee + waterVatAmount;
      const vatAmount = electricVatAmount + waterVatAmount;
      const totalCost = electricityCost + waterCost;

      const assignmentQuery: Record<string, unknown> = { roomId: usage.roomId, status: RoomAssignmentStatus.ACTIVE };
      if (activeSemester) assignmentQuery.semesterId = activeSemester._id;
      const assignments = await RoomAssignment.find(assignmentQuery).populate('studentId', 'studentCode fullName').lean();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + billingConfig.paymentDueDays);

      const roomMemberSnapshot = assignments.map((a) => {
        const s = a.studentId as unknown as { _id: string; studentCode: string; fullName: string };
        return { studentId: s._id.toString(), studentCode: s.studentCode, fullName: s.fullName };
      });

      const priceConfigSnapshot = {
        tiers: tierData,
        freeWaterQuota: billingConfig.freeWaterQuota,
        waterUnitPrice: billingConfig.waterUnitPrice,
        electricVatRate: billingConfig.electricVatRate,
        waterVatRate: billingConfig.waterVatRate,
        wastewaterFeeRate: billingConfig.wastewaterFeeRate,
        electricBeforeVat,
        electricVatAmount,
        waterBeforeTax,
        waterVatAmount,
        wastewaterFee,
      };

      const [bill] = await UtilityBill.create(
        [{
          roomId: usage.roomId,
          semesterId: activeSemester?._id,
          usageId: usage._id,
          month, year, electricityUsage, waterUsage,
          electricityCost, waterCost, vatAmount, totalCost,
          status: BillStatus.UNPAID,
          dueDate,
          priceConfigSnapshot,
          roomMemberSnapshot,
          createdBy,
        }],
        { session },
      );

      const memberCount = assignments.length;
      if (memberCount > 0) {
        const shareBase = Math.ceil(totalCost / memberCount);
        const members = assignments.map((a, idx) => ({
          billId: bill._id,
          studentId: (a.studentId as unknown as { _id: string })._id,
          amountShare: idx < memberCount - 1 ? shareBase : totalCost - shareBase * (memberCount - 1),
          status: 'UNPAID',
        }));
        await UtilityBillMember.insertMany(members, { session });
        notifyStudentIds.push(...members.map((m) => m.studentId.toString()));
      }

      createdBills.push({ roomId: usage.roomId.toString(), totalCost, memberCount });
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Notifications outside transaction
  if (notifyStudentIds.length > 0) {
    const notif = await Notification.create({
      title: 'Hóa đơn điện nước mới',
      content: `Hóa đơn điện nước tháng ${month}/${year} đã được tạo. Vui lòng kiểm tra và thanh toán trước hạn.`,
      scope: NotificationScope.PRIVATE,
      type: NotificationType.BILL,
      createdBy,
    });
    const uniqueIds = [...new Set(notifyStudentIds)];
    await NotificationReceiver.insertMany(
      uniqueIds.map((studentId) => ({ notificationId: notif._id, studentId })),
    );
  }

  logActivity({ userId: createdBy, action: AuditAction.BILL_CREATE, entityName: 'UtilityBill', description: `Tạo ${createdBills.length} hóa đơn tháng ${month}/${year}` });

  return { billsCreated: createdBills.length, bills: createdBills };
}

export async function list(pagination: PaginationQuery, filters: { month?: number; year?: number; status?: string; buildingId?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.month) query.month = filters.month;
  if (filters.year) query.year = filters.year;
  if (filters.status) query.status = filters.status;

  if (filters.buildingId) {
    const { Floor } = await import('../../models/floor.model.js');
    const floors = await Floor.find({ buildingId: filters.buildingId }).select('_id').lean();
    const rooms = await Room.find({ floorId: { $in: floors.map((f) => f._id) } }).select('_id').lean();
    query.roomId = { $in: rooms.map((r) => r._id) };
  }

  const [items, totalItems] = await Promise.all([
    UtilityBill.find(query)
      .populate({ path: 'roomId', select: 'roomNumber floorId', populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } } })
      .populate('semesterId', 'name')
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    UtilityBill.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}

export async function getById(id: string): Promise<Record<string, unknown>> {
  const bill = await UtilityBill.findById(id)
    .populate({ path: 'roomId', select: 'roomNumber floorId', populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } } })
    .populate('semesterId', 'name')
    .lean();
  if (!bill) throw new AppError(404, 'Hóa đơn không tồn tại', ErrorCode.BILL_NOT_FOUND);

  const members = await UtilityBillMember.find({ billId: id })
    .populate('studentId', 'studentCode fullName')
    .lean();

  await Promise.all(members.map(async (m) => {
    if (!m.amountShare) {
      let count = bill.roomMemberSnapshot?.length || 0;
      if (count === 0) {
        count = await UtilityBillMember.countDocuments({ billId: bill._id });
      }
      if (count > 0) {
        m.amountShare = Math.round(bill.totalCost / count);
      }
    }
  }));

  return { ...(bill as Record<string, unknown>), members };
}

export async function getMyBills(userId: string) {
  const student = await Student.findOne({ userId });
  if (!student) return [];

  const members = await UtilityBillMember.find({ studentId: student._id })
    .populate({
      path: 'billId',
      populate: { path: 'roomId', select: 'roomNumber floorId', populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } } },
    })
    .sort({ 'billId.year': -1, 'billId.month': -1 })
    .lean();

  await Promise.all(members.map(async (m) => {
    if (!m.amountShare && m.billId && typeof m.billId === 'object') {
      const bill = m.billId as any;
      let count = bill.roomMemberSnapshot?.length || 0;
      if (count === 0) {
        count = await UtilityBillMember.countDocuments({ billId: bill._id });
      }
      if (count > 0) {
        m.amountShare = Math.round(bill.totalCost / count);
      }
    }
  }));

  return members;
}

export async function markOverdue(id: string) {
  const bill = await UtilityBill.findById(id);
  if (!bill) throw new AppError(404, 'Hóa đơn không tồn tại', ErrorCode.BILL_NOT_FOUND);
  if (bill.status !== BillStatus.UNPAID) {
    throw new AppError(400, 'Chỉ hóa đơn chưa thanh toán mới có thể đánh dấu quá hạn', ErrorCode.VALIDATION_ERROR);
  }
  bill.status = BillStatus.OVERDUE;
  await bill.save();
  return bill;
}

export async function cancel(id: string) {
  const bill = await UtilityBill.findById(id);
  if (!bill) throw new AppError(404, 'Hóa đơn không tồn tại', ErrorCode.BILL_NOT_FOUND);
  if (bill.status === BillStatus.PAID) {
    throw new AppError(400, 'Không thể hủy hóa đơn đã thanh toán', ErrorCode.VALIDATION_ERROR);
  }
  if (bill.status === BillStatus.CANCELLED) {
    throw new AppError(400, 'Hóa đơn đã bị hủy', ErrorCode.VALIDATION_ERROR);
  }
  bill.status = BillStatus.CANCELLED;
  bill.usageId = undefined;
  await bill.save();

  await UtilityBillMember.updateMany(
    { billId: bill._id },
    { $set: { status: BillMemberStatus.CANCELLED } }
  );

  return bill;
}
