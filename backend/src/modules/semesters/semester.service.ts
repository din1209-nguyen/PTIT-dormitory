import { Semester } from '../../models/semester.model.js';
import { Student } from '../../models/student.model.js';
import { Bed } from '../../models/bed.model.js';
import { RoomAssignment, RoomAssignmentStatus } from '../../models/roomAssignment.model.js';
import { AppError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { SemesterStatus, SemesterTerm, ResidenceType, BedStatus } from '../../common/constants/enums.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

function getAcademicYears(now: Date) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month >= 9 ? year : year - 1;
  return [
    `${startYear - 2}-${startYear - 1}`,
    `${startYear - 1}-${startYear}`,
    `${startYear}-${startYear + 1}`,
    `${startYear + 1}-${startYear + 2}`
  ];
}

function buildSemesterDefs(academicYear: string) {
  const [startYear, endYear] = academicYear.split('-').map(Number);
  return [
    {
      term: SemesterTerm.SEMESTER_1,
      name: `Kỳ 1 ${academicYear}`,
      academicYear,
      startDate: new Date(startYear, 8, 1),
      endDate: new Date(endYear, 0, 31),
    },
    {
      term: SemesterTerm.SEMESTER_2,
      name: `Kỳ 2 ${academicYear}`,
      academicYear,
      startDate: new Date(endYear, 1, 1),
      endDate: new Date(endYear, 5, 30),
    },
    {
      term: SemesterTerm.SUMMER,
      name: `Kỳ hè ${academicYear}`,
      academicYear,
      startDate: new Date(endYear, 6, 1),
      endDate: new Date(endYear, 7, 31),
    },
  ];
}

export async function ensureUpcomingSemesters() {
  const years = getAcademicYears(new Date());
  for (const ay of years) {
    for (const def of buildSemesterDefs(ay)) {
      await Semester.findOneAndUpdate(
        { term: def.term, academicYear: def.academicYear },
        { $setOnInsert: { name: def.name, startDate: def.startDate, endDate: def.endDate, status: SemesterStatus.UNOPENED } },
        { upsert: true },
      );
    }
  }
  const now = new Date();

  // 1. Set all semesters in the past (endDate < now) to FINISHED if they are UNOPENED, PREPARING, or ACTIVE
  await Semester.updateMany(
    { status: { $in: [SemesterStatus.UNOPENED, SemesterStatus.PREPARING, SemesterStatus.ACTIVE] }, endDate: { $lt: now } },
    { $set: { status: SemesterStatus.FINISHED } }
  );

  // 2. Sequential Rule: 
  // - If there is an ACTIVE semester -> NO PREPARING semester is allowed (demote all to UNOPENED).
  // - If there is NO ACTIVE semester -> Exactly 1 PREPARING semester is allowed (the earliest UNOPENED).
  const activeCount = await Semester.countDocuments({ status: SemesterStatus.ACTIVE });
  const preparingSemesters = await Semester.find({ status: SemesterStatus.PREPARING }).sort({ startDate: 1 });

  if (activeCount > 0) {
    if (preparingSemesters.length > 0) {
      const toDemote = preparingSemesters.map(s => s._id);
      await Semester.updateMany({ _id: { $in: toDemote } }, { $set: { status: SemesterStatus.UNOPENED } });
    }
  } else {
    if (preparingSemesters.length > 1) {
      const toDemote = preparingSemesters.slice(1).map(s => s._id);
      await Semester.updateMany({ _id: { $in: toDemote } }, { $set: { status: SemesterStatus.UNOPENED } });
    } else if (preparingSemesters.length === 0) {
      const nextSemester = await Semester.findOne({ status: SemesterStatus.UNOPENED }).sort({ startDate: 1 });
      if (nextSemester) {
        nextSemester.status = SemesterStatus.PREPARING;
        await nextSemester.save();
      }
    }
  }
}

export async function listSemesters(pagination: PaginationQuery, filters: { status?: string }) {
  await ensureUpcomingSemesters();

  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (pagination.keyword) {
    query.$or = [
      { name: { $regex: pagination.keyword, $options: 'i' } },
      { academicYear: { $regex: pagination.keyword, $options: 'i' } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    Semester.find(query)
      .sort({ startDate: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Semester.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}

export async function getSemesterById(id: string) {
  const semester = await Semester.findById(id).lean();
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  return semester;
}

export async function activateSemester(id: string) {
  const semester = await Semester.findById(id);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (semester.status !== SemesterStatus.PREPARING) {
    throw new AppError(400, 'Chỉ có thể kích hoạt kỳ lưu trú ở trạng thái Chuẩn bị', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  const existingActive = await Semester.findOne({ status: SemesterStatus.ACTIVE });
  if (existingActive) {
    throw new AppError(409, 'Đã có kỳ lưu trú khác đang hoạt động', ErrorCode.SEMESTER_ALREADY_ACTIVE);
  }

  semester.status = SemesterStatus.ACTIVE;
  await semester.save();
  return semester;
}

export async function updateSemester(id: string, data: { startDate: string; endDate: string }) {
  const semester = await Semester.findById(id);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (semester.status !== SemesterStatus.UNOPENED) {
    throw new AppError(400, 'Chỉ có thể chỉnh sửa thời gian cho kỳ lưu trú Chưa mở', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (start >= end) {
    throw new AppError(400, 'Ngày kết thúc phải sau ngày bắt đầu', ErrorCode.INVALID_DATE);
  }

  // Check for overlap with ANY existing semester except this one
  const overlapping = await Semester.findOne({
    _id: { $ne: id },
    $or: [
      { startDate: { $lte: end }, endDate: { $gte: start } }
    ]
  });

  if (overlapping) {
    throw new AppError(400, `Thời gian này bị trùng lặp với "${overlapping.name}"`, ErrorCode.SEMESTER_OVERLAP);
  }

  semester.startDate = start;
  semester.endDate = end;
  await semester.save();
  return semester;
}

export async function revertSemester(id: string) {
  const semester = await Semester.findById(id);
  if (!semester) throw new NotFoundError('Không tìm thấy kỳ lưu trú', ErrorCode.SEMESTER_NOT_FOUND);
  if (semester.status !== SemesterStatus.ACTIVE) {
    throw new AppError(400, 'Chỉ có thể hoàn tác cho kỳ lưu trú đang hoạt động', ErrorCode.SEMESTER_INVALID_STATUS);
  }

  const activeAssignments = await RoomAssignment.find({ semesterId: id, status: RoomAssignmentStatus.ACTIVE });
  if (activeAssignments.length > 0) {
    const now = new Date();
    if (now >= semester.startDate) {
      throw new AppError(400, 'Không thể hoàn tác vì kỳ lưu trú đã bắt đầu và đã có sinh viên được xếp phòng', ErrorCode.SEMESTER_HAS_DATA);
    }
    
    // Auto cancel all active assignments if semester hasn't started
    const bedIds = activeAssignments.map(a => a.bedId);
    const studentIds = activeAssignments.map(a => a.studentId);
    
    await RoomAssignment.updateMany(
      { semesterId: id, status: RoomAssignmentStatus.ACTIVE },
      { $set: { status: RoomAssignmentStatus.CANCELLED } }
    );
    
    // Free up the beds
    await Bed.updateMany(
      { _id: { $in: bedIds } },
      { $set: { status: BedStatus.AVAILABLE } }
    );
    
    // Set student residenceType back to PENDING_ROOM
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { residenceType: ResidenceType.PENDING_ROOM } }
    );
  }

  semester.status = SemesterStatus.PREPARING;
  await semester.save();
  return semester;
}
