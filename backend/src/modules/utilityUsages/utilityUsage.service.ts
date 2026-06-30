import { UtilityUsage } from '../../models/utilityUsage.model.js';
import { UtilityBill } from '../../models/utilityBill.model.js';
import { Room } from '../../models/room.model.js';
import { AppError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { BillStatus } from '../../common/constants/enums.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

export async function create(data: Record<string, unknown>, recordedBy: string) {
  const { roomId, month, year, oldElectricity, newElectricity, oldWater, newWater } = data as {
    roomId: string; month: number; year: number;
    oldElectricity: number; newElectricity: number;
    oldWater: number; newWater: number;
  };

  if (newElectricity < oldElectricity) {
    throw new AppError(400, 'Chỉ số điện mới phải >= chỉ số cũ', ErrorCode.VALIDATION_ERROR);
  }
  if (newWater < oldWater) {
    throw new AppError(400, 'Chỉ số nước mới phải >= chỉ số cũ', ErrorCode.VALIDATION_ERROR);
  }

  const room = await Room.findById(roomId);
  if (!room) throw new AppError(404, 'Phòng không tồn tại', ErrorCode.ROOM_NOT_FOUND);

  const existing = await UtilityUsage.findOne({ roomId, month, year });
  if (existing) {
    const bill = await UtilityBill.findOne({ roomId, month, year, status: { $ne: BillStatus.CANCELLED } });
    if (bill) {
      throw new AppError(409, 'Không thể sửa chỉ số vì hóa đơn tháng này đã được lập', ErrorCode.UTILITY_USAGE_INVALID);
    }
    existing.oldElectricity = oldElectricity;
    existing.newElectricity = newElectricity;
    existing.oldWater = oldWater;
    existing.newWater = newWater;
    existing.recordedBy = recordedBy as any;
    existing.recordedAt = new Date();
    await existing.save();
    return existing;
  }

  return UtilityUsage.create({ roomId, month, year, oldElectricity, newElectricity, oldWater, newWater, recordedBy });
}

interface UsageFilters {
  month?: number;
  year?: number;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
}

export async function list(pagination: PaginationQuery, filters: UsageFilters) {
  const query: Record<string, unknown> = {};
  if (filters.month) query.month = filters.month;
  if (filters.year) query.year = filters.year;
  if (filters.roomId) query.roomId = filters.roomId;

  if (filters.floorId && !filters.roomId) {
    const rooms = await Room.find({ floorId: filters.floorId }).select('_id').lean();
    query.roomId = { $in: rooms.map((r) => r._id) };
  } else if (filters.buildingId) {
    const { Floor } = await import('../../models/floor.model.js');
    const floors = await Floor.find({ buildingId: filters.buildingId }).select('_id').lean();
    const rooms = await Room.find({ floorId: { $in: floors.map((f) => f._id) } }).select('_id').lean();
    query.roomId = { $in: rooms.map((r) => r._id) };
  }

  const [items, totalItems] = await Promise.all([
    UtilityUsage.find(query)
      .populate({ path: 'roomId', select: 'roomNumber floorId', populate: { path: 'floorId', select: 'floorNumber buildingId', populate: { path: 'buildingId', select: 'name' } } })
      .populate('recordedBy', 'fullName')
      .sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    UtilityUsage.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}
