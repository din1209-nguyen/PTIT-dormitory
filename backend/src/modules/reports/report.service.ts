import mongoose from 'mongoose';
import { Student } from '../../models/student.model.js';
import { Room } from '../../models/room.model.js';
import { Bed } from '../../models/bed.model.js';
import { Building } from '../../models/building.model.js';
import { Floor } from '../../models/floor.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../../models/roomAssignment.model.js';
import { Semester } from '../../models/semester.model.js';
import { UtilityBill } from '../../models/utilityBill.model.js';
import { Payment } from '../../models/payment.model.js';
import { Violation } from '../../models/violation.model.js';
import { StudentRequest } from '../../models/studentRequest.model.js';
import { ResidenceType, SemesterStatus, BillStatus } from '../../common/constants/enums.js';

// Xác định học kỳ đang hoạt động khi request không truyền học kỳ
async function getActiveSemesterId(semesterId?: string) {
  if (semesterId) return new mongoose.Types.ObjectId(semesterId);
  const active = await Semester.findOne({ status: SemesterStatus.ACTIVE }).select('_id').lean();
  return active?._id;
}

// Tạo báo cáo tổng quan sinh viên đang cư trú
export async function residenceReport(_semesterId?: string) {
  const total = await Student.countDocuments({ residenceType: ResidenceType.RESIDING });

  const [byGender, byDepartment, freshmanCount] = await Promise.all([
    Student.aggregate([
      { $match: { residenceType: ResidenceType.RESIDING } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]),
    Student.aggregate([
      { $match: { residenceType: ResidenceType.RESIDING } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]),
    Student.countDocuments({ residenceType: ResidenceType.RESIDING, isFreshman: true }),
  ]);

  return {
    total,
    byGender: byGender.map((g) => ({ gender: g._id, count: g.count })),
    byDepartment: byDepartment.map((d) => ({ department: d._id || 'Không rõ', count: d.count })),
    freshman: freshmanCount,
    returning: total - freshmanCount,
  };
}

// Tạo báo cáo sức chứa ký túc xá theo học kỳ
export async function dormitoryCapacityReport(semesterId?: string) {
  const semId = await getActiveSemesterId(semesterId);

  const [totalRooms, totalBeds, buildings] = await Promise.all([
    Room.countDocuments({ status: 'ACTIVE' }),
    Bed.countDocuments({ status: { $in: ['AVAILABLE', 'OCCUPIED'] } }),
    Building.find().select('_id name').lean(),
  ]);

  const occupiedQuery: Record<string, unknown> = { status: RoomAssignmentStatus.ACTIVE };
  if (semId) occupiedQuery.semesterId = semId;
  const occupiedBeds = await RoomAssignment.countDocuments(occupiedQuery);

  const byBuilding = await Promise.all(
    buildings.map(async (b) => {
      const floors = await Floor.find({ buildingId: b._id }).select('_id').lean();
      const floorIds = floors.map((f) => f._id);
      const rooms = await Room.find({ floorId: { $in: floorIds }, status: 'ACTIVE' }).select('_id').lean();
      const roomIds = rooms.map((r) => r._id);
      const beds = await Bed.countDocuments({ roomId: { $in: roomIds }, status: { $in: ['AVAILABLE', 'OCCUPIED'] } });
      const occQuery: Record<string, unknown> = { roomId: { $in: roomIds }, status: RoomAssignmentStatus.ACTIVE };
      if (semId) occQuery.semesterId = semId;
      const occupied = await RoomAssignment.countDocuments(occQuery);
      return { name: b.name, totalBeds: beds, occupiedBeds: occupied };
    }),
  );

  return {
    totalRooms,
    totalBeds,
    occupiedBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    byBuilding,
  };
}

// Tạo báo cáo hóa đơn điện nước theo tháng năm
export async function utilityReport(month?: number, year?: number) {
  const match: Record<string, unknown> = {};
  if (month) match.month = month;
  if (year) match.year = year;

  const [statusAgg, totals] = await Promise.all([
    UtilityBill.aggregate([
      { $match: { ...match, status: { $ne: BillStatus.CANCELLED } } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalCost' } } },
    ]),
    UtilityBill.aggregate([
      { $match: { ...match, status: { $ne: BillStatus.CANCELLED } } },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalAmount: { $sum: '$totalCost' },
          totalElectricityCost: { $sum: '$electricityCost' },
          totalWaterCost: { $sum: '$waterCost' },
          totalVat: { $sum: '$vatAmount' },
          avgElectricity: { $avg: '$electricityUsage' },
          avgWater: { $avg: '$waterUsage' },
        },
      },
    ]),
  ]);

  const t = totals[0] || { totalBills: 0, totalAmount: 0, totalElectricityCost: 0, totalWaterCost: 0, totalVat: 0, avgElectricity: 0, avgWater: 0 };

  return {
    totalBills: t.totalBills,
    totalAmount: Math.round(t.totalAmount),
    totalElectricityCost: Math.round(t.totalElectricityCost),
    totalWaterCost: Math.round(t.totalWaterCost),
    totalVat: Math.round(t.totalVat),
    avgElectricityPerRoom: Math.round(t.avgElectricity || 0),
    avgWaterPerRoom: Math.round((t.avgWater || 0) * 100) / 100,
    byStatus: statusAgg.map((s) => ({ status: s._id, count: s.count, total: Math.round(s.total) })),
  };
}

// Tạo báo cáo thanh toán theo tháng năm
export async function paymentReport(month?: number, year?: number) {
  const billMatch: Record<string, unknown> = {};
  if (month) billMatch.month = month;
  if (year) billMatch.year = year;

  let billIds: mongoose.Types.ObjectId[] | undefined;
  if (month || year) {
    const bills = await UtilityBill.find(billMatch).select('_id').lean();
    billIds = bills.map((b) => b._id as mongoose.Types.ObjectId);
  }

  const paymentMatch: Record<string, unknown> = {};
  if (billIds) paymentMatch.billId = { $in: billIds };

  const [byMethod, byStatus, totalBilled] = await Promise.all([
    Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    UtilityBill.aggregate([
      { $match: { ...billMatch, status: { $ne: BillStatus.CANCELLED } } },
      { $group: { _id: null, total: { $sum: '$totalCost' } } },
    ]),
  ]);

  const successAmount = byStatus.find((s) => s._id === 'SUCCESS')?.total || 0;
  const billedAmount = totalBilled[0]?.total || 0;

  return {
    byMethod: byMethod.map((m) => ({ method: m._id, count: m.count, total: Math.round(m.total) })),
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count, total: Math.round(s.total) })),
    collectionRate: billedAmount > 0 ? Math.round((successAmount / billedAmount) * 100) : 0,
    totalCollected: Math.round(successAmount),
    totalBilled: Math.round(billedAmount),
  };
}

// Tạo báo cáo vi phạm theo học kỳ
export async function violationReport(semesterId?: string) {
  const semId = await getActiveSemesterId(semesterId);
  const match: Record<string, unknown> = {};
  if (semId) match.semesterId = semId;

  const [byStatus, topViolators, byMonth, total] = await Promise.all([
    Violation.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Violation.aggregate([
      { $match: match },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, count: 1, studentCode: '$student.studentCode', fullName: '$student.fullName' } },
    ]),
    Violation.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: '$violationDate' }, month: { $month: '$violationDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Violation.countDocuments(match),
  ]);

  return {
    total,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    topViolators,
    byMonth: byMonth.map((m) => ({ month: m._id.month, year: m._id.year, count: m.count })),
  };
}

// Tạo báo cáo yêu cầu sinh viên
export async function requestReport(_semesterId?: string) {
  const match: Record<string, unknown> = {};

  const [byType, byStatus, avgProcessing, total] = await Promise.all([
    StudentRequest.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    StudentRequest.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    StudentRequest.aggregate([
      { $match: { processedAt: { $ne: null } } },
      { $project: { processingTime: { $subtract: ['$processedAt', '$createdAt'] } } },
      { $group: { _id: null, avg: { $avg: '$processingTime' } } },
    ]),
    StudentRequest.countDocuments(match),
  ]);

  const avgHours = avgProcessing[0]?.avg ? Math.round(avgProcessing[0].avg / 3600000) : 0;

  return {
    total,
    byType: byType.map((t) => ({ type: t._id, count: t.count })),
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    avgProcessingHours: avgHours,
  };
}

// Tạo báo cáo xu hướng giữa các học kỳ
export async function trendReport(startSemesterId?: string, endSemesterId?: string) {
  const match: Record<string, any> = {
    status: { $in: [SemesterStatus.ACTIVE, SemesterStatus.FINISHED] }
  };

  let startSem, endSem;
  if (startSemesterId) {
    startSem = await Semester.findById(startSemesterId).lean();
  }
  if (endSemesterId) {
    endSem = await Semester.findById(endSemesterId).lean();
  }

  if (startSem || endSem) {
    match.startDate = {};
    if (startSem) match.startDate.$gte = startSem.startDate;
    if (endSem) match.startDate.$lte = endSem.startDate;
  }

  // Get filtered semesters sorted by startDate ascending
  const semesters = await Semester.find(match).sort({ startDate: 1 }).lean();

  const trends = await Promise.all(
    semesters.map(async (sem) => {
      const semId = sem._id;

      // 1. Residence & Capacity
      // Count assignments that are ACTIVE or ENDED (meaning they resided in that semester)
      const occupiedBeds = await RoomAssignment.countDocuments({
        semesterId: semId,
        status: { $in: [RoomAssignmentStatus.ACTIVE, 'ENDED'] as any },
      });
      // For total beds, we can't easily get historical total beds, so we query current ones.
      const totalBeds = await Bed.countDocuments({ status: { $in: ['AVAILABLE', 'OCCUPIED'] } });
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const residenceTotal = occupiedBeds;

      // 2. Utility & Payments
      const bills = await UtilityBill.find({
        semesterId: semId,
        status: { $ne: BillStatus.CANCELLED },
      })
        .select('_id totalCost')
        .lean();
      
      const utilityAmount = bills.reduce((sum, b) => sum + b.totalCost, 0);
      const billIds = bills.map((b) => b._id);

      let collectionRate = 0;
      if (billIds.length > 0) {
        const payments = await Payment.aggregate([
          { $match: { billId: { $in: billIds }, status: 'SUCCESS' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const collectedAmount = payments[0]?.total || 0;
        collectionRate = utilityAmount > 0 ? Math.round((collectedAmount / utilityAmount) * 100) : 0;
      }

      // 3. Violations
      const violationCount = await Violation.countDocuments({ semesterId: semId });

      // 4. Requests
      const requestCount = await StudentRequest.countDocuments({
        createdAt: { $gte: sem.startDate, $lte: sem.endDate },
      });

      return {
        name: sem.name,
        academicYear: sem.academicYear,
        residenceTotal,
        occupancyRate,
        utilityAmount,
        collectionRate,
        violationCount,
        requestCount,
      };
    })
  );

  return trends;
}
