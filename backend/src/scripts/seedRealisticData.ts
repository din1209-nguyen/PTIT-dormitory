import mongoose from 'mongoose';
import { Semester } from '../models/semester.model.js';
import { Student } from '../models/student.model.js';
import { Room } from '../models/room.model.js';
import { Bed } from '../models/bed.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../models/roomAssignment.model.js';
import { ResidenceRecord } from '../models/residenceRecord.model.js';
import { UtilityUsage } from '../models/utilityUsage.model.js';
import { UtilityBill } from '../models/utilityBill.model.js';
import { UtilityBillMember } from '../models/utilityBillMember.model.js';
import { Payment } from '../models/payment.model.js';
import { Violation } from '../models/violation.model.js';
import { StudentRequest } from '../models/studentRequest.model.js';
import { 
  SemesterStatus, BillStatus, 
  BillMemberStatus, PaymentStatus, PaymentMethod, 
  ViolationStatus, RequestType, RequestStatus, ResidenceType 
} from '../common/constants/enums.js';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRandomDateInSemester(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export async function seedRealisticTransactions() {
  console.log('🔄 Đang khởi tạo dữ liệu mô phỏng thực tế (Transactions, Bills, Assignments)...');

  // 1. Get semesters to simulate
  const semesters = await Semester.find({
    status: { $in: [SemesterStatus.ACTIVE, SemesterStatus.FINISHED] }
  }).sort({ startDate: 1 });

  if (semesters.length === 0) {
    console.log('⚠️ Không có học kỳ nào để mô phỏng!');
    return;
  }

  console.log(`  > Tìm thấy ${semesters.length} học kỳ để mô phỏng.`);

  // Load base data
  const students = await Student.find().lean();
  const rooms = await Room.find().lean();
  const allBeds = await Bed.find().lean();

  const maleStudents = students.filter(s => s.gender === 'MALE');
  const femaleStudents = students.filter(s => s.gender === 'FEMALE');

  const maleRooms = rooms.filter(r => r.genderType === 'MALE');
  const femaleRooms = rooms.filter(r => r.genderType === 'FEMALE');

  for (const sem of semesters) {
    console.log(`\n  ⏳ Đang xử lý kỳ: ${sem.name} (${sem.academicYear}) - ${sem.status}`);
    const isFinished = sem.status === SemesterStatus.FINISHED;
    const semStatus = isFinished ? RoomAssignmentStatus.ENDED : RoomAssignmentStatus.ACTIVE;

    const assignmentOps: any[] = [];
    const recordOps: any[] = [];
    const usageOps: any[] = [];
    const billOps: any[] = [];
    const billMemberOps: any[] = [];
    const paymentOps: any[] = [];
    const violationOps: any[] = [];
    const requestOps: any[] = [];

    // ASSIGNMENTS
    const assignedBeds = new Set<string>();
    const assignedStudents = new Set<string>();

    const assignStudentsToRooms = (studentList: any[], roomList: any[]) => {
      let sIdx = 0;
      // Shuffle students for randomness
      const shuffledStudents = shuffle([...studentList]);

      // Guarantee N21DCCN001 (Demo Student) is always at the front if present
      const demoIndex = shuffledStudents.findIndex((s: any) => s.studentCode === 'N21DCCN001');
      if (demoIndex !== -1) {
        const [demoStudent] = shuffledStudents.splice(demoIndex, 1);
        shuffledStudents.unshift(demoStudent);
      }

      for (const room of roomList) {
        const roomBeds = allBeds.filter(b => b.roomId.toString() === room._id.toString());
        // Fill 70% to 100% of the room randomly
        const fillCount = randomInt(Math.floor(roomBeds.length * 0.7), roomBeds.length);
        
        let filled = 0;
        for (const bed of roomBeds) {
          if (filled >= fillCount || sIdx >= shuffledStudents.length) break;
          const student = shuffledStudents[sIdx++];
          
          assignedBeds.add(bed._id.toString());
          assignedStudents.add(student._id.toString());

          const assignmentId = new mongoose.Types.ObjectId();
          const recordId = new mongoose.Types.ObjectId();
          const checkInDate = new Date(sem.startDate.getTime() + randomInt(0, 5) * 86400000); // within first 5 days

          assignmentOps.push({
            insertOne: {
              document: {
                _id: assignmentId,
                residenceRecordId: recordId,
                studentId: student._id,
                roomId: room._id,
                bedId: bed._id,
                semesterId: sem._id,
                status: semStatus,
                assignedAt: checkInDate,
                studentSnapshot: {
                  studentCode: student.studentCode,
                  fullName: student.fullName,
                  gender: student.gender,
                  className: student.className,
                  major: student.major,
                  department: student.department,
                  academicYear: student.academicYear,
                },
                roomSnapshot: {
                  roomNumber: room.roomNumber,
                  bedNumber: bed.bedNumber,
                  genderType: room.genderType,
                  capacity: room.capacity,
                },
                createdAt: checkInDate,
                updatedAt: checkInDate
              }
            }
          });

          recordOps.push({
            insertOne: {
              document: {
                _id: recordId,
                studentId: student._id,
                semesterId: sem._id,
                startDate: checkInDate,
                endDate: isFinished ? sem.endDate : undefined,
                registeredAt: checkInDate,
                status: isFinished ? 'ENDED' : 'ACTIVE',
                createdAt: checkInDate,
                updatedAt: checkInDate
              }
            }
          });

          filled++;
        }
      }
    };

    assignStudentsToRooms(maleStudents, maleRooms);
    assignStudentsToRooms(femaleStudents, femaleRooms);

    console.log(`    - Đã xếp phòng cho ${assignmentOps.length} sinh viên.`);

    // If active semester, update beds and students statuses
    if (!isFinished) {
      await Bed.updateMany({ _id: { $in: Array.from(assignedBeds) } }, { status: 'OCCUPIED' });
      await Student.updateMany({ _id: { $in: Array.from(assignedStudents) } }, { residenceType: ResidenceType.RESIDING });
    }

    // UTILITY BILLS & PAYMENTS (Monthly)
    const startMonth = sem.startDate.getMonth() + 1;
    const startYear = sem.startDate.getFullYear();
    const endMonth = sem.endDate.getMonth() + 1;
    const endYear = sem.endDate.getFullYear();

    const monthsInSem: { month: number, year: number }[] = [];
    let curMonth = startMonth;
    let curYear = startYear;
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      monthsInSem.push({ month: curMonth, year: curYear });
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    // Get all rooms that have assignments in this semester
    const roomAssignmentsMap = new Map<string, any[]>();
    for (const op of assignmentOps) {
      const doc = op.insertOne.document;
      const rId = doc.roomId.toString();
      if (!roomAssignmentsMap.has(rId)) roomAssignmentsMap.set(rId, []);
      roomAssignmentsMap.get(rId)!.push(doc);
    }

    for (const { month, year } of monthsInSem) {
      // Don't generate bills for current month if semester is active, just to be safe or only past months
      const now = new Date();
      if (!isFinished && year === now.getFullYear() && month === now.getMonth() + 1) {
        continue;
      }

      for (const [roomId, occupants] of roomAssignmentsMap.entries()) {
        const usageId = new mongoose.Types.ObjectId();
        const electricityUsage = randomInt(50, 300);
        const waterUsage = randomInt(10, 50);
        
        // Accurate calculations based on real service logic
        const electricBeforeVat = electricityUsage * 2500;
        const electricVatAmount = Math.round(electricBeforeVat * 0.1);
        const electricityCost = electricBeforeVat + electricVatAmount;
        
        const waterBeforeTax = Math.round(Math.max(waterUsage - 3, 0) * 8500);
        const wastewaterFee = Math.round(waterBeforeTax * 0.1);
        const waterVatAmount = Math.round(waterBeforeTax * 0.05);
        const waterCost = waterBeforeTax + wastewaterFee + waterVatAmount;
        
        const vatAmount = electricVatAmount + waterVatAmount;
        const totalCost = electricityCost + waterCost;

        const priceConfigSnapshot = {
          tiers: [{ tierOrder: 1, fromKwh: 0, toKwh: null, unitPrice: 2500 }],
          freeWaterQuota: 3,
          waterUnitPrice: 8500,
          electricVatRate: 0.1,
          waterVatRate: 0.05,
          wastewaterFeeRate: 0.1,
          electricBeforeVat,
          electricVatAmount,
          waterBeforeTax,
          waterVatAmount,
          wastewaterFee,
        };

        const isPaid = Math.random() < 0.9; // 90% payment rate for past months
        const billStatus = isPaid ? BillStatus.PAID : BillStatus.UNPAID;

        const billId = new mongoose.Types.ObjectId();

        usageOps.push({
          insertOne: {
            document: {
              _id: usageId,
              roomId: new mongoose.Types.ObjectId(roomId),
              semesterId: sem._id,
              month,
              year,
              oldElectricity: 0,
              newElectricity: electricityUsage,
              oldWater: 0,
              newWater: waterUsage,
              recordedAt: new Date(year, month - 1, 28)
            }
          }
        });

        billOps.push({
          insertOne: {
            document: {
              _id: billId,
              roomId: new mongoose.Types.ObjectId(roomId),
              semesterId: sem._id,
              usageId,
              month,
              year,
              electricityUsage,
              waterUsage,
              electricityCost,
              waterCost,
              vatAmount,
              totalCost,
              status: billStatus,
              dueDate: new Date(year, month, 5),
              priceConfigSnapshot,
              createdAt: new Date(year, month - 1, 28)
            }
          }
        });

        // Bill Members
        const costPerMember = Math.floor(totalCost / occupants.length);
        for (const occ of occupants) {
          const memberBillId = new mongoose.Types.ObjectId();
          const pDate = new Date(year, month - 1, randomInt(1, 28));
          
          billMemberOps.push({
            insertOne: {
              document: {
                _id: memberBillId,
                billId,
                studentId: occ.studentId,
                amountShare: costPerMember,
                status: isPaid ? BillMemberStatus.PAID : BillMemberStatus.UNPAID,
                paidAt: isPaid ? pDate : undefined
              }
            }
          });

          if (isPaid) {
            const isVnpay = Math.random() > 0.3;
            const txnRef = `SIM_${billId.toString()}_${occ.studentId.toString()}`;
            paymentOps.push({
              insertOne: {
                document: {
                  billId,
                  studentId: occ.studentId,
                  amount: costPerMember,
                  method: isVnpay ? PaymentMethod.VNPAY : PaymentMethod.CASH,
                  status: PaymentStatus.SUCCESS,
                  vnpTxnRef: isVnpay ? txnRef : undefined,
                  vnpTransactionNo: isVnpay ? `VNP${randomInt(100000, 999999)}` : undefined,
                  vnpResponseCode: isVnpay ? '00' : undefined,
                  vnpPayDate: isVnpay ? `${year}${String(month).padStart(2, '0')}${String(pDate.getDate()).padStart(2, '0')}120000` : undefined,
                  paidAt: pDate,
                  createdAt: pDate,
                  updatedAt: pDate
                }
              }
            });
          }
        }
      }
    }
    console.log(`    - Đã tạo ${billOps.length} hóa đơn điện nước và ${paymentOps.length} thanh toán.`);

    // VIOLATIONS & REQUESTS
    const numViolations = randomInt(20, 80);
    for (let i = 0; i < numViolations; i++) {
      const student = Array.from(assignedStudents)[randomInt(0, assignedStudents.size - 1)];
      const vDate = getRandomDateInSemester(sem.startDate, sem.endDate);
      violationOps.push({
        insertOne: {
          document: {
            studentId: new mongoose.Types.ObjectId(student),
            semesterId: sem._id,
            description: `Vi phạm ngẫu nhiên ${i} (Nấu ăn, Về trễ, v.v)`,
            violationDate: vDate,
            status: ViolationStatus.RESOLVED,
            penalty: 'Nhắc nhở',
            createdAt: vDate
          }
        }
      });
    }

    const numRequests = randomInt(50, 150);
    const reqTypes = [RequestType.REQUEST, RequestType.COMPLAINT, RequestType.FEEDBACK, RequestType.OTHER];
    for (let i = 0; i < numRequests; i++) {
      const student = Array.from(assignedStudents)[randomInt(0, assignedStudents.size - 1)];
      const rDate = getRandomDateInSemester(sem.startDate, sem.endDate);
      const rType = reqTypes[randomInt(0, reqTypes.length - 1)];
      const processedAt = new Date(rDate.getTime() + randomInt(1, 48) * 3600000); // Processed in 1-48 hours

      requestOps.push({
        insertOne: {
          document: {
            studentId: new mongoose.Types.ObjectId(student),
            semesterId: sem._id,
            type: rType,
            title: `Yêu cầu/Phản ánh ngẫu nhiên ${i}`,
            content: 'Nội dung phản ánh chi tiết về cơ sở vật chất...',
            status: RequestStatus.RESOLVED,
            createdAt: rDate,
            processedAt,
            response: 'Đã tiếp nhận và xử lý.',
            updatedAt: processedAt
          }
        }
      });
    }

    // Execute Bulk Writes
    if (assignmentOps.length > 0) await RoomAssignment.bulkWrite(assignmentOps);
    if (recordOps.length > 0) await ResidenceRecord.bulkWrite(recordOps);
    if (usageOps.length > 0) await UtilityUsage.bulkWrite(usageOps);
    if (billOps.length > 0) await UtilityBill.bulkWrite(billOps);
    if (billMemberOps.length > 0) await UtilityBillMember.bulkWrite(billMemberOps);
    if (paymentOps.length > 0) await Payment.bulkWrite(paymentOps);
    if (violationOps.length > 0) await Violation.bulkWrite(violationOps);
    if (requestOps.length > 0) await StudentRequest.bulkWrite(requestOps);
  }

  console.log('\n✅ Hoàn tất tạo dữ liệu mô phỏng thực tế!');
}
