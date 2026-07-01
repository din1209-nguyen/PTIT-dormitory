import mongoose, { type ClientSession } from 'mongoose';
import { Student, type IStudent } from '../../models/student.model.js';
import { Semester } from '../../models/semester.model.js';
import { ResidenceRecord } from '../../models/residenceRecord.model.js';
import { Room, type IRoom } from '../../models/room.model.js';
import { Bed, type IBed } from '../../models/bed.model.js';
import { Floor } from '../../models/floor.model.js';
import { Building } from '../../models/building.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../../models/roomAssignment.model.js';
import { AppError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { RoomStatus, BedStatus, SemesterStatus, SemesterTerm, Gender, ResidenceType } from '../../common/constants/enums.js';

interface RoomWithBeds {
  room: IRoom;
  floor: { floorNumber: number; buildingId: string };
  buildingName: string;
  availableBeds: IBed[];
  occupants: Array<{
    className?: string;
    major?: string;
    academicYear?: string;
    department?: string;
  }>;
}

export interface AssignmentResult {
  totalStudents: number;
  assignedCount: number;
  unassignedCount: number;
  unassignedStudentIds: string[];
  warnings: string[];
}

export interface AssignmentHistoryFilters {
  keyword?: string;
  gender?: string;
  department?: string;
  residenceType?: string;
  isFreshman?: boolean;
  building?: string;
  room?: string;
}

async function getAvailableRooms(session?: ClientSession): Promise<RoomWithBeds[]> {
  const s = session ?? null;
  const [rooms, floors, buildings, beds, activeAssignments] = await Promise.all([
    Room.find({ status: RoomStatus.ACTIVE }).session(s).lean(),
    Floor.find().session(s).lean(),
    Building.find({ status: 'ACTIVE' }).session(s).lean(),
    Bed.find({ status: BedStatus.AVAILABLE }).session(s).lean(),
    RoomAssignment.find({ status: RoomAssignmentStatus.ACTIVE }).select('roomId bedId studentSnapshot').session(s).lean(),
  ]);

  const floorMap = new Map(floors.map(f => [f._id.toString(), f]));
  const buildingMap = new Map(buildings.map(b => [b._id.toString(), b]));
  const activeBuildingIds = new Set(buildings.map(b => b._id.toString()));

  const bedsByRoom = new Map<string, typeof beds>();
  for (const bed of beds) {
    const rid = bed.roomId.toString();
    if (!bedsByRoom.has(rid)) bedsByRoom.set(rid, []);
    bedsByRoom.get(rid)!.push(bed);
  }

  const assignCountByRoom = new Map<string, number>();
  const usedBedsByRoom = new Map<string, Set<string>>();
  const occupantsByRoom = new Map<string, RoomWithBeds['occupants']>();
  for (const a of activeAssignments) {
    const rid = a.roomId.toString();
    assignCountByRoom.set(rid, (assignCountByRoom.get(rid) || 0) + 1);
    if (!usedBedsByRoom.has(rid)) usedBedsByRoom.set(rid, new Set());
    usedBedsByRoom.get(rid)!.add(a.bedId.toString());
    if (!occupantsByRoom.has(rid)) occupantsByRoom.set(rid, []);
    const snapshot = (a.studentSnapshot || {}) as RoomWithBeds['occupants'][number];
    occupantsByRoom.get(rid)!.push({
      className: snapshot.className,
      major: snapshot.major,
      academicYear: snapshot.academicYear,
      department: snapshot.department,
    });
  }

  const result: RoomWithBeds[] = [];
  for (const room of rooms) {
    const floor = floorMap.get(room.floorId.toString());
    if (!floor) continue;
    if (!activeBuildingIds.has(floor.buildingId.toString())) continue;
    const building = buildingMap.get(floor.buildingId.toString());
    if (!building) continue;

    const roomBeds = bedsByRoom.get(room._id.toString()) || [];
    const usedBeds = usedBedsByRoom.get(room._id.toString()) || new Set();
    const availableBeds = roomBeds
      .filter(b => !usedBeds.has(b._id.toString()))
      .sort((a, b) => compareRoomText(a.bedNumber, b.bedNumber));
    const assignCount = assignCountByRoom.get(room._id.toString()) || 0;

    if (availableBeds.length > 0 && assignCount < room.capacity) {
      result.push({
        room: room as unknown as IRoom,
        floor: { floorNumber: floor.floorNumber, buildingId: floor.buildingId.toString() },
        buildingName: building.name,
        availableBeds: availableBeds as unknown as IBed[],
        occupants: occupantsByRoom.get(room._id.toString()) || [],
      });
    }
  }

  return result.sort((a, b) => {
    const genderCmp = compareRoomText(a.room.genderType, b.room.genderType);
    if (genderCmp !== 0) return genderCmp;
    const buildingCmp = compareRoomText(a.buildingName, b.buildingName);
    if (buildingCmp !== 0) return buildingCmp;
    const floorCmp = a.floor.floorNumber - b.floor.floorNumber;
    if (floorCmp !== 0) return floorCmp;
    return compareRoomText(a.room.roomNumber, b.room.roomNumber);
  });
}

function buildSnapshot(student: IStudent, room: IRoom, bed: IBed, buildingName: string, floorNumber: number) {
  return {
    studentSnapshot: { studentCode: student.studentCode, fullName: student.fullName, gender: student.gender, className: student.className, major: student.major, department: student.department, academicYear: student.academicYear },
    roomSnapshot: { buildingName, floorNumber, roomNumber: room.roomNumber, bedNumber: bed.bedNumber },
  };
}

type StudentQueueItem = {
  student: IStudent;
  recordId: string;
  registeredAt: Date;
};

type PlannedAssignment = {
  studentId: string;
  recordId: string;
  roomIdx: number;
  bedIdx: number;
};

function normalizeSortValue(value?: unknown) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN');
}

function compareRoomText(a?: unknown, b?: unknown) {
  return String(a || '').localeCompare(String(b || ''), 'vi-VN', { numeric: true, sensitivity: 'base' });
}

// Sắp xếp hàng đợi sinh viên theo thứ tự ưu tiên: Khoa -> Ngành -> Khóa -> Lớp -> Ngày đăng ký
function sortAssignmentQueue(queue: StudentQueueItem[]) {
  return [...queue].sort((a, b) => {
    // Ưu tiên gom nhóm sinh viên có cùng chung các đặc điểm học tập lại gần nhau
    const fields: Array<keyof IStudent> = ['department', 'major', 'academicYear', 'className'];
    for (const field of fields) {
      const cmp = normalizeSortValue(a.student[field]).localeCompare(normalizeSortValue(b.student[field]), 'vi-VN');
      if (cmp !== 0) return cmp;
    }

    // Nếu có cùng đặc điểm học tập, ưu tiên giải quyết cho sinh viên nộp hồ sơ sớm hơn
    const dateCmp = a.registeredAt.getTime() - b.registeredAt.getTime();
    if (dateCmp !== 0) return dateCmp;

    // Đảm bảo tính ổn định của thuật toán sắp xếp (stable sort) bằng ID
    return a.student._id.toString().localeCompare(b.student._id.toString());
  });
}

// Đếm số lượng giường còn trống (chưa bị ai chọn) trong một phòng cụ thể
function freeBedCount(room: RoomWithBeds, usedBeds: Set<string>) {
  return room.availableBeds.filter((bed) => !usedBeds.has(bed._id.toString())).length;
}

// Tìm vị trí của chiếc giường trống tiếp theo trong phòng
function findNextBedIndex(room: RoomWithBeds, usedBeds: Set<string>) {
  return room.availableBeds.findIndex((bed) => !usedBeds.has(bed._id.toString()));
}

// Đánh giá mức độ phù hợp của một sinh viên với một phòng cụ thể (dựa trên bạn cùng phòng)
function roomFitStats(student: IStudent, room: RoomWithBeds) {
  // Đặt điểm thấp cho phòng trống để ưu tiên lấp đầy phòng đã mở trước
  if (room.occupants.length === 0) {
    return { score: 0, matchingOccupants: 0 };
  }

  let score = 100;
  let matchingOccupants = 0;

  // Duyệt qua từng người đang ở trong phòng để chấm điểm độ tương đồng
  for (const occupant of room.occupants) {
    // Cộng điểm rất cao (400) nếu trùng cả Lớp học
    if (occupant.className && student.className && occupant.className === student.className) {
      score = Math.max(score, 400);
      matchingOccupants += 1;
      // Cộng điểm cao (300) nếu trùng Ngành và trùng Khóa (ví dụ cùng D21 CNTT)
    } else if (
      occupant.major && student.major && occupant.major === student.major
      && occupant.academicYear && student.academicYear && occupant.academicYear === student.academicYear
    ) {
      score = Math.max(score, 300);
      matchingOccupants += 1;
      // Cộng điểm vừa (200) nếu chỉ trùng Khoa
    } else if (occupant.department && student.department && occupant.department === student.department) {
      score = Math.max(score, 200);
      matchingOccupants += 1;
    }
  }

  return { score, matchingOccupants };
}

function pickBestRoomIndexForStudent(student: IStudent, roomIndices: number[], availableRooms: RoomWithBeds[], usedBeds: Set<string>) {
  let bestRoomIdx = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMatchingOccupants = Number.NEGATIVE_INFINITY;
  let bestOccupiedCount = Number.NEGATIVE_INFINITY;

  // Quét qua danh sách các phòng được phép xếp
  for (const roomIdx of roomIndices) {
    const room = availableRooms[roomIdx];
    if (!room) continue;
    // Bỏ qua phòng sai giới tính hoặc hết giường
    if (String(room.room.genderType) !== String(student.gender)) continue;
    if (freeBedCount(room, usedBeds) <= 0) continue;

    // Tính điểm mức độ phù hợp với các bạn trong phòng
    const { score, matchingOccupants } = roomFitStats(student, room);
    const occupiedCount = room.occupants.length;

    // Lựa chọn phòng theo nguyên tắc: Ưu tiên điểm cao -> Nhóm đông hơn -> Ưu tiên lấp đầy phòng đã có người
    if (
      score > bestScore
      || (score === bestScore && matchingOccupants > bestMatchingOccupants)
      || (score === bestScore && matchingOccupants === bestMatchingOccupants && occupiedCount > bestOccupiedCount)
    ) {
      bestScore = score;
      bestMatchingOccupants = matchingOccupants;
      bestOccupiedCount = occupiedCount;
      bestRoomIdx = roomIdx;
    }
  }

  return bestRoomIdx;
}

// Thực thi thuật toán gán phòng tự động hàng loạt cho sinh viên
export async function autoAssignRooms(semesterId: string, assignedBy: string, excludeStudentIds?: string[], session?: ClientSession): Promise<AssignmentResult> {
  // Lấy dữ liệu học kỳ và kiểm tra tính hợp lệ
  const semester = await Semester.findById(semesterId).session(session ?? null);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);

  // Truy vấn toàn bộ hồ sơ đăng ký lưu trú của kỳ này
  const records = await ResidenceRecord.find({ semesterId }).session(session ?? null).lean();
  // Lấy danh sách sinh viên đã được xếp phòng trong kỳ hiện tại
  const existingAssignments = await RoomAssignment.find({ semesterId, status: RoomAssignmentStatus.ACTIVE }).session(session ?? null).lean();
  // Tạo một Set để lưu trữ ID của các sinh viên đã được xếp phòng
  const assignedStudentIds = new Set(existingAssignments.map((assignment) => assignment.studentId.toString()));
  // Tạo một Set để lưu trữ ID của các sinh viên bị loại trừ
  const excludeSet = new Set(excludeStudentIds || []);
  // Lọc ra danh sách sinh viên chưa được xếp phòng
  const unassignedRecords = records.filter((record) => (
    !assignedStudentIds.has(record.studentId.toString())
    && !excludeSet.has(record.studentId.toString())
  ));
  // Nếu không có sinh viên nào chưa được xếp phòng, trả về kết quả rỗng
  if (unassignedRecords.length === 0) {
    return {
      totalStudents: 0,
      assignedCount: 0,
      unassignedCount: 0,
      unassignedStudentIds: [],
      warnings: ['Không có sinh viên chưa được xếp phòng'],
    };
  }

  // Lấy chi tiết thông tin các sinh viên chưa được xếp phòng
  const studentIds = unassignedRecords.map((record) => record.studentId);
  const students = await Student.find({ _id: { $in: studentIds } }).session(session ?? null).lean();
  const studentMap = new Map(students.map((student) => [student._id.toString(), student as unknown as IStudent]));
  const recordMap = new Map(unassignedRecords.map((record) => [record.studentId.toString(), record]));

  // Khởi tạo hàng đợi chờ xếp phòng với thông tin đăng ký tương ứng
  const queueItems = students.flatMap((student) => {
    const record = recordMap.get(student._id.toString());
    if (!record) return [];
    return [{
      student: student as unknown as IStudent,
      recordId: record._id.toString(),
      registeredAt: new Date(record.registeredAt || record.createdAt || 0),
    }];
  });

  // Tải danh sách phòng và giường còn trống trong KTX
  const availableRooms = await getAvailableRooms(session);
  const assignments: PlannedAssignment[] = [];
  const usedBeds = new Set<string>();
  const assignedIds = new Set<string>();

  // Gán trực tiếp một sinh viên vào một phòng cụ thể (nếu phòng đó hợp lệ)
  function assignStudent(item: StudentQueueItem, roomIdx: number) {
    const room = availableRooms[roomIdx];
    // Chặn việc xếp sai giới tính
    if (!room || String(room.room.genderType) !== String(item.student.gender)) return false;

    // Lấy giường trống kế tiếp
    const bedIdx = findNextBedIndex(room, usedBeds);
    if (bedIdx < 0) return false;

    // Đánh dấu giường đã có chủ
    const bedId = room.availableBeds[bedIdx]._id.toString();
    usedBeds.add(bedId);
    assignedIds.add(item.student._id.toString());

    // Ghi nhận dự định xếp phòng (chưa lưu DB)
    assignments.push({ studentId: item.student._id.toString(), recordId: item.recordId, roomIdx, bedIdx });

    // Thêm sinh viên vào danh sách người đang ở ảo để tính điểm cho sinh viên tiếp theo
    room.occupants.push({
      className: item.student.className,
      major: item.student.major,
      academicYear: item.student.academicYear,
      department: item.student.department,
    });
    return true;
  }

  // Tìm kiếm và gán sinh viên vào căn phòng phù hợp nhất (Best Fit Algorithm)
  function assignToBestRoom(item: StudentQueueItem, roomIndices: number[]) {
    const bestRoomIdx = pickBestRoomIndexForStudent(item.student, roomIndices, availableRooms, usedBeds);

    // Nếu tìm thấy phòng tốt nhất, tiến hành gán phòng
    return bestRoomIdx >= 0 ? assignStudent(item, bestRoomIdx) : false;
  }

  // Chạy quy trình xếp phòng độc lập cho nam và nữ
  for (const gender of [Gender.MALE, Gender.FEMALE]) {
    // Sắp xếp thứ tự ưu tiên của hàng đợi theo giới tính
    const genderQueue = sortAssignmentQueue(queueItems.filter((item) => item.student.gender === gender));

    // Lấy danh sách các phòng hợp lệ cho giới tính này
    const genderRoomIndices = availableRooms
      .map((room, idx) => ({ room, idx }))
      .filter(({ room }) => String(room.room.genderType) === String(gender))
      .map(({ idx }) => idx);

    // Chỉ áp dụng xếp ưu tiên Tân sinh viên nếu đang là giai đoạn chuẩn bị của Kỳ 1 (đầu năm học)
    const shouldUseFreshmanPriority = semester.status === SemesterStatus.PREPARING && semester.term === SemesterTerm.SEMESTER_1;

    // Nếu không thuộc diện ưu tiên (VD: Đang là kỳ 2, hoặc kỳ đã hoạt động), quét xếp tự do cho toàn bộ sinh viên
    if (semester.status === SemesterStatus.ACTIVE || !shouldUseFreshmanPriority) {
      for (const item of genderQueue) assignToBestRoom(item, genderRoomIndices);
      continue;
    }

    // Tách riêng nhóm Tân sinh viên (Khu dành riêng) và nhóm Sinh viên cũ
    const freshmanQueue = genderQueue.filter((item) => item.student.isFreshman);
    const regularQueue = genderQueue.filter((item) => !item.student.isFreshman);

    // Lọc các phòng được quy hoạch riêng cho Tân sinh viên
    const freshmanRoomIndices = availableRooms
      .map((room, idx) => ({ room, idx }))
      .filter(({ room }) => String(room.room.genderType) === String(gender) && room.room.isFreshmanPriority)
      .map(({ idx }) => idx);

    // Lọc các phòng thường (dành cho sinh viên khóa cũ)
    const regularRoomIndices = availableRooms
      .map((room, idx) => ({ room, idx }))
      .filter(({ room }) => String(room.room.genderType) === String(gender) && !room.room.isFreshmanPriority)
      .map(({ idx }) => idx);

    // Xếp Tân sinh viên vào các phòng ưu tiên của họ trước
    const overflowFreshmen: StudentQueueItem[] = [];
    for (const item of freshmanQueue) {
      // Đẩy những Tân sinh viên không còn phòng ưu tiên vào danh sách chờ tràn
      if (!assignToBestRoom(item, freshmanRoomIndices)) overflowFreshmen.push(item);
    }

    // Gộp chung các phòng thường
    const usableRegularRooms = [...regularRoomIndices];
    // Nếu tất cả Tân sinh viên đã có chỗ mà phòng tân sinh viên vẫn còn trống, mở khóa phòng đó cho sinh viên cũ ở
    if (overflowFreshmen.length === 0) {
      for (const roomIdx of freshmanRoomIndices) {
        if (freeBedCount(availableRooms[roomIdx], usedBeds) > 0) usableRegularRooms.push(roomIdx);
      }
    }

    // Cuối cùng, xếp những Tân sinh viên bị tràn (do thiếu phòng ưu tiên) và Sinh viên cũ vào các phòng còn lại
    for (const item of [...overflowFreshmen, ...regularQueue]) {
      assignToBestRoom(item, usableRegularRooms);
    }
  }

  // Chuẩn bị các tài liệu để Insert vào cơ sở dữ liệu
  const docs = assignments.map((assignment) => {
    const rwb = availableRooms[assignment.roomIdx];
    const bed = rwb.availableBeds[assignment.bedIdx];
    const student = studentMap.get(assignment.studentId)!;
    // Chụp lại thông tin phòng/giường vào thời điểm xếp để lưu lịch sử
    const snapshots = buildSnapshot(student, rwb.room, bed, rwb.buildingName, rwb.floor.floorNumber);

    return {
      residenceRecordId: assignment.recordId,
      studentId: assignment.studentId,
      semesterId,
      roomId: rwb.room._id,
      bedId: bed._id,
      assignedBy,
      assignedAt: new Date(),
      status: RoomAssignmentStatus.ACTIVE,
      ...snapshots,
    };
  });

  // Ghi nhận toàn bộ thông tin xếp phòng vào DB và cập nhật trạng thái giường, sinh viên
  if (docs.length > 0) {
    await RoomAssignment.insertMany(docs, { session: session ?? undefined });
    await Student.updateMany(
      { _id: { $in: docs.map((doc) => doc.studentId) } },
      { residenceType: ResidenceType.RESIDING },
    ).session(session ?? null);
    await Bed.updateMany(
      { _id: { $in: docs.map((doc) => doc.bedId) } },
      { status: BedStatus.OCCUPIED },
    ).session(session ?? null);
  }

  const unassignedStudentIds = queueItems
    .map((item) => item.student._id.toString())
    .filter((studentId) => !assignedIds.has(studentId));
  const warnings = unassignedStudentIds.map((studentId) => {
    const student = studentMap.get(studentId);
    return student ? `Không thể xếp phòng: ${student.studentCode} ${student.fullName}` : `Không thể xếp phòng: ${studentId}`;
  });

  return {
    totalStudents: queueItems.length,
    assignedCount: docs.length,
    unassignedCount: unassignedStudentIds.length,
    unassignedStudentIds,
    warnings,
  };
}

export const __roomAssignmentTestUtils = {
  pickBestRoomIndexForStudent,
  roomFitStats,
};

export async function manualAssign(data: { studentId: string; roomId: string; bedId: string; semesterId: string; assignedBy: string }) {
  const semester = await Semester.findById(data.semesterId);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (!['PREPARING', 'ACTIVE'].includes(semester.status)) {
    throw new AppError(400, 'Không thể thao tác vì kỳ lưu trú đã kết thúc hoặc chưa mở', ErrorCode.ROOM_ASSIGNMENT_FAILED);
  }

  const student = await Student.findById(data.studentId);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  const room = await Room.findById(data.roomId);
  if (!room) throw new NotFoundError('Không tìm thấy phòng', ErrorCode.ROOM_NOT_FOUND);

  const bed = await Bed.findById(data.bedId);
  if (!bed) throw new NotFoundError('Không tìm thấy giường', ErrorCode.BED_NOT_FOUND);

  if (String(room.genderType) !== String(student.gender)) {
    throw new AppError(400, 'Giới tính không phù hợp với phòng', ErrorCode.ROOM_GENDER_MISMATCH);
  }

  const existingStudent = await RoomAssignment.findOne({ studentId: data.studentId, semesterId: data.semesterId, status: RoomAssignmentStatus.ACTIVE });
  if (existingStudent) throw new AppError(409, 'Sinh viên đã được xếp phòng trong kỳ này', ErrorCode.ROOM_ASSIGNMENT_DUPLICATE_STUDENT);

  const existingBed = await RoomAssignment.findOne({ bedId: data.bedId, semesterId: data.semesterId, status: RoomAssignmentStatus.ACTIVE });
  if (existingBed) throw new AppError(409, 'Giường đã được xếp trong kỳ này', ErrorCode.ROOM_ASSIGNMENT_DUPLICATE_BED);

  const record = await ResidenceRecord.findOne({ studentId: data.studentId, semesterId: data.semesterId });
  if (!record) throw new AppError(400, 'Sinh viên chưa có hồ sơ lưu trú cho kỳ này', ErrorCode.ROOM_ASSIGNMENT_FAILED);

  const floor = await Floor.findById(room.floorId).lean();
  const building = floor ? await Building.findById(floor.buildingId).lean() : null;
  const snapshots = buildSnapshot(student as IStudent, room as IRoom, bed as IBed, building?.name || '', floor?.floorNumber || 0);

  const assignment = await RoomAssignment.create({
    residenceRecordId: record._id,
    studentId: data.studentId,
    semesterId: data.semesterId,
    roomId: data.roomId,
    bedId: data.bedId,
    assignedBy: data.assignedBy,
    assignedAt: new Date(),
    status: RoomAssignmentStatus.ACTIVE,
    ...snapshots,
  });

  await Student.findByIdAndUpdate(data.studentId, { residenceType: ResidenceType.RESIDING });
  await Bed.findByIdAndUpdate(data.bedId, { status: BedStatus.OCCUPIED });

  return assignment;
}

export async function getAssignmentsBySemester(semesterId: string) {
  return RoomAssignment.find({ semesterId, status: RoomAssignmentStatus.ACTIVE }).populate('studentId', 'studentCode fullName gender className department').populate('roomId', 'roomNumber genderType capacity isFreshmanPriority').populate('bedId', 'bedNumber').sort({ 'roomSnapshot.buildingName': 1, 'roomSnapshot.roomNumber': 1 }).lean();
}

function normalizeSearch(value?: unknown) {
  return String(value || '').trim().toLowerCase();
}

function getAssignmentPosition(assignment: any) {
  const room = assignment.roomId || {};
  const bed = assignment.bedId || {};
  const snapshot = assignment.roomSnapshot || {};
  return {
    buildingName: String(snapshot.buildingName || ''),
    floorNumber: snapshot.floorNumber,
    roomNumber: String(snapshot.roomNumber || room.roomNumber || ''),
    bedNumber: String(snapshot.bedNumber || bed.bedNumber || ''),
  };
}

export function formatAssignmentPosition(assignment: any) {
  const position = getAssignmentPosition(assignment);
  const parts = [
    position.buildingName ? `Khu ${position.buildingName}` : '',
    position.floorNumber ? `T\u1ea7ng ${position.floorNumber}` : '',
    position.roomNumber ? `Ph\u00f2ng ${position.roomNumber}` : '',
    position.bedNumber ? `Gi\u01b0\u1eddng ${position.bedNumber}` : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

export async function getHistoryBySemester(semesterId: string, filters: AssignmentHistoryFilters = {}) {
  const assignments = await RoomAssignment.find({ semesterId })
    .populate('studentId', 'studentCode fullName gender email phone address className major department academicYear isFreshman residenceType')
    .populate('roomId', 'roomNumber')
    .populate('bedId', 'bedNumber')
    .populate('residenceRecordId', 'startDate endDate')
    .sort({ 'roomSnapshot.buildingName': 1, 'roomSnapshot.roomNumber': 1 })
    .lean();

  const keyword = normalizeSearch(filters.keyword);
  const building = normalizeSearch(filters.building);
  const room = normalizeSearch(filters.room);

  const filteredAssignments = assignments.filter((assignment: any) => {
    const student = assignment.studentId || {};
    const position = getAssignmentPosition(assignment);

    if (filters.gender && student.gender !== filters.gender) return false;
    if (filters.department && student.department !== filters.department) return false;
    if (filters.residenceType && student.residenceType !== filters.residenceType) return false;
    if (filters.isFreshman !== undefined && Boolean(student.isFreshman) !== filters.isFreshman) return false;
    if (building && !normalizeSearch(position.buildingName).includes(building)) return false;
    if (room && !normalizeSearch(position.roomNumber).includes(room)) return false;

    if (keyword) {
      const haystack = [
        student.studentCode,
        student.fullName,
        student.email,
        student.className,
        student.department,
        position.buildingName,
        position.roomNumber,
        position.bedNumber,
      ].map(normalizeSearch).join(' ');
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });

  // Deduplicate by studentId, keeping the latest assignment
  const latestByStudent = new Map<string, any>();
  for (const assignment of filteredAssignments) {
    const studentId = assignment.studentId?._id?.toString() || assignment.studentId?.toString();
    if (!studentId) continue;
    const existing = latestByStudent.get(studentId);
    if (!existing || new Date(assignment.assignedAt).getTime() > new Date(existing.assignedAt).getTime()) {
      latestByStudent.set(studentId, assignment);
    }
  }
  
  return Array.from(latestByStudent.values()).sort((a, b) => {
    const posA = getAssignmentPosition(a);
    const posB = getAssignmentPosition(b);
    return posA.buildingName.localeCompare(posB.buildingName) || posA.roomNumber.localeCompare(posB.roomNumber);
  });
}

export async function getUnassignedStudentsBySemester(semesterId: string) {
  const records = await ResidenceRecord.find({ semesterId }).lean();
  const assignments = await RoomAssignment.find({ semesterId, status: RoomAssignmentStatus.ACTIVE }).lean();
  const assignedStudentIds = new Set(assignments.map(a => a.studentId.toString()));

  const unassignedStudentIds = records
    .map(r => r.studentId)
    .filter(id => !assignedStudentIds.has(id.toString()));

  return Student.find({ _id: { $in: unassignedStudentIds } })
    .select('studentCode fullName gender className major department academicYear')
    .sort({ studentCode: 1 })
    .lean();
}

export async function getAssignmentsByStudent(studentId: string) {
  const assignments = await RoomAssignment.find({ studentId })
    .populate('semesterId', 'name term academicYear startDate endDate status')
    .populate({
      path: 'roomId',
      select: 'roomNumber floorId genderType capacity isFreshmanPriority',
      populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } },
    })
    .populate('bedId', 'bedNumber')
    .sort({ assignedAt: -1 })
    .lean();
  
  // Deduplicate by semesterId, keeping the latest assignment
  const latestBySemester = new Map<string, any>();
  for (const assignment of assignments) {
    const semId = assignment.semesterId?._id?.toString() || assignment.semesterId?.toString();
    if (!semId) continue;
    const existing = latestBySemester.get(semId);
    if (!existing || new Date(assignment.assignedAt).getTime() > new Date(existing.assignedAt).getTime()) {
      latestBySemester.set(semId, assignment);
    }
  }
  
  return Array.from(latestBySemester.values()).sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}

export async function getRoomMembers(roomId: string, semesterId?: string) {
  const query: Record<string, unknown> = { roomId };
  if (semesterId) {
    query.semesterId = semesterId;
    query.status = { $in: [RoomAssignmentStatus.ACTIVE, RoomAssignmentStatus.ENDED] };
  } else {
    query.status = RoomAssignmentStatus.ACTIVE;
  }

  // Lấy danh sách thành viên cùng phòng và loại bỏ bản ghi đã hủy
  return RoomAssignment.find(query)
    .populate('studentId', 'studentCode fullName gender email phone className major department academicYear residenceType')
    .populate({
      path: 'roomId',
      select: 'roomNumber floorId genderType capacity isFreshmanPriority',
      populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } },
    })
    .populate('bedId', 'bedNumber')
    .sort({ 'roomSnapshot.bedNumber': 1, assignedAt: 1 })
    .lean();
}

export async function unassignRoom(assignmentId: string) {
  const assignment = await RoomAssignment.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Không tìm thấy bản ghi xếp phòng', ErrorCode.ROOM_ASSIGNMENT_NOT_FOUND);

  const semester = await Semester.findById(assignment.semesterId);
  if (semester && !['PREPARING', 'ACTIVE'].includes(semester.status)) {
    throw new AppError(400, 'Không thể thao tác vì kỳ lưu trú đã kết thúc hoặc chưa mở', ErrorCode.ROOM_ASSIGNMENT_FAILED);
  }

  if (assignment.status !== RoomAssignmentStatus.ACTIVE) throw new AppError(400, 'Bản ghi xếp phòng không còn hiệu lực', ErrorCode.ROOM_ASSIGNMENT_FAILED);

  assignment.status = RoomAssignmentStatus.CANCELLED;
  await assignment.save();

  await Bed.findByIdAndUpdate(assignment.bedId, { status: BedStatus.AVAILABLE });

  const activeAssignments = await RoomAssignment.countDocuments({ studentId: assignment.studentId, status: RoomAssignmentStatus.ACTIVE });
  if (activeAssignments === 0) {
    await Student.findByIdAndUpdate(assignment.studentId, { residenceType: ResidenceType.PENDING_ROOM });
  }

  return assignment;
}

export async function transferRoom(assignmentId: string, data: { newRoomId: string; newBedId: string; assignedBy: string }) {
  const assignment = await RoomAssignment.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Không tìm thấy bản ghi xếp phòng', ErrorCode.ROOM_ASSIGNMENT_NOT_FOUND);

  const semester = await Semester.findById(assignment.semesterId);
  if (semester && !['PREPARING', 'ACTIVE'].includes(semester.status)) {
    throw new AppError(400, 'Không thể thao tác vì kỳ lưu trú đã kết thúc hoặc chưa mở', ErrorCode.ROOM_ASSIGNMENT_FAILED);
  }

  if (assignment.status !== RoomAssignmentStatus.ACTIVE) throw new AppError(400, 'Bản ghi xếp phòng không còn hiệu lực', ErrorCode.ROOM_ASSIGNMENT_FAILED);

  const student = await Student.findById(assignment.studentId);
  if (!student) throw new NotFoundError('Không tìm thấy sinh viên', ErrorCode.STUDENT_NOT_FOUND);

  const newRoom = await Room.findById(data.newRoomId);
  if (!newRoom) throw new NotFoundError('Không tìm thấy phòng mới', ErrorCode.ROOM_NOT_FOUND);

  const newBed = await Bed.findById(data.newBedId);
  if (!newBed) throw new NotFoundError('Không tìm thấy giường mới', ErrorCode.BED_NOT_FOUND);
  if (newBed.status === BedStatus.OCCUPIED) throw new AppError(409, 'Giường mới đã có người', ErrorCode.ROOM_ASSIGNMENT_DUPLICATE_BED);

  if (String(newRoom.genderType) !== String(student.gender)) {
    throw new AppError(400, 'Giới tính không phù hợp với phòng mới', ErrorCode.ROOM_GENDER_MISMATCH);
  }

  const floor = await Floor.findById(newRoom.floorId).lean();
  const building = floor ? await Building.findById(floor.buildingId).lean() : null;
  const snapshots = buildSnapshot(student as IStudent, newRoom as IRoom, newBed as IBed, building?.name || '', floor?.floorNumber || 0);

  // Free old bed
  await Bed.findByIdAndUpdate(assignment.bedId, { status: BedStatus.AVAILABLE });

  // Update assignment
  assignment.roomId = newRoom._id;
  assignment.bedId = newBed._id;
  assignment.assignedBy = new mongoose.Types.ObjectId(data.assignedBy) as any;
  assignment.studentSnapshot = snapshots.studentSnapshot;
  assignment.roomSnapshot = snapshots.roomSnapshot;
  await assignment.save();

  // Occupy new bed
  await Bed.findByIdAndUpdate(data.newBedId, { status: BedStatus.OCCUPIED });

  return assignment;
}

export async function removeUnassignedStudents(semesterId: string, excludeStudentIds?: string[], session?: mongoose.mongo.ClientSession) {
  const semester = await Semester.findById(semesterId).session(session ?? null);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);

  // Lấy tất cả sinh viên chưa xếp phòng của kỳ
  const unassignedRecords = await getUnassignedStudentsBySemester(semesterId);
  const unassignedStudentIds = unassignedRecords.map((r: any) => r._id.toString());
  
  // Loại bỏ các sinh viên nằm trong danh sách loại trừ
  const excludeSet = new Set(excludeStudentIds || []);
  const targetStudentIds = unassignedStudentIds.filter(id => !excludeSet.has(id));

  if (targetStudentIds.length === 0) {
    return { success: true, count: 0 };
  }

  // Xóa ResidenceRecord của những sinh viên mục tiêu trong học kỳ này
  await ResidenceRecord.deleteMany({
    semesterId,
    studentId: { $in: targetStudentIds }
  }).session(session ?? null);

  // Cập nhật trạng thái cư trú của những sinh viên không còn bản ghi lưu trú nào khác
  const remainingRecords = await ResidenceRecord.find({
    studentId: { $in: targetStudentIds }
  }).session(session ?? null).lean();
  
  const studentsWithOtherRecords = new Set(remainingRecords.map(r => r.studentId.toString()));
  const studentsToReset = targetStudentIds.filter(id => !studentsWithOtherRecords.has(id));

  if (studentsToReset.length > 0) {
    await Student.updateMany(
      { _id: { $in: studentsToReset } },
      { residenceType: ResidenceType.NOT_RESIDING }
    ).session(session ?? null);
  }

  return { success: true, count: targetStudentIds.length };
}
