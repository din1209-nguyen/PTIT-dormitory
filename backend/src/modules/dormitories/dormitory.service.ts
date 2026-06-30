import mongoose from 'mongoose';
import { Building } from '../../models/building.model.js';
import { Floor } from '../../models/floor.model.js';
import { Room } from '../../models/room.model.js';
import { Bed } from '../../models/bed.model.js';
import { AppError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { BedStatus, RoomStatus } from '../../common/constants/enums.js';

// ---- Building ----
export async function listBuildings(filter: { status?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;

  return Building.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'floors',
        localField: '_id',
        foreignField: 'buildingId',
        as: 'floors'
      }
    },
    {
      $lookup: {
        from: 'rooms',
        localField: 'floors._id',
        foreignField: 'floorId',
        as: 'rooms'
      }
    },
    {
      $lookup: {
        from: 'beds',
        localField: 'rooms._id',
        foreignField: 'roomId',
        as: 'beds'
      }
    },
    {
      $addFields: {
        stats: {
          floorCount: { $size: '$floors' },
          roomCount: { $size: '$rooms' },
          activeRoomCount: {
            $size: { $filter: { input: '$rooms', as: 'room', cond: { $eq: ['$$room.status', 'ACTIVE'] } } }
          },
          bedCount: { $size: '$beds' },
          activeBedCount: {
            $size: {
              $filter: { input: '$beds', as: 'bed', cond: { $in: ['$$bed.status', ['AVAILABLE', 'OCCUPIED']] } }
            }
          },
          occupiedBedCount: {
            $size: {
              $filter: { input: '$beds', as: 'bed', cond: { $eq: ['$$bed.status', 'OCCUPIED'] } }
            }
          }
        }
      }
    },
    { $project: { floors: 0, rooms: 0, beds: 0 } },
    { $sort: { name: 1 } }
  ]);
}

export async function createBuilding(data: Record<string, unknown>) {
  return Building.create(data);
}

export async function updateBuilding(id: string, data: Record<string, unknown>) {
  if (data.status !== undefined) {
    const floors = await Floor.find({ buildingId: id }).select('_id').lean();
    const rooms = await Room.find({ floorId: { $in: floors.map(f => f._id) } }).select('_id').lean();
    
    if (data.status === 'MAINTENANCE' || data.status === 'INACTIVE') {
      const occupiedBed = await Bed.findOne({ roomId: { $in: rooms.map(r => r._id) }, status: BedStatus.OCCUPIED }).lean();
      if (occupiedBed) throw new AppError(400, 'Không thể đổi trạng thái tòa nhà đang có sinh viên ở', ErrorCode.INVALID_DATA);
      
      await Floor.updateMany({ buildingId: id }, { status: data.status });
      await Room.updateMany({ floorId: { $in: floors.map(f => f._id) } }, { status: data.status });
      await Bed.updateMany({ roomId: { $in: rooms.map(r => r._id) }, status: { $ne: BedStatus.OCCUPIED } }, { status: BedStatus.MAINTENANCE });
    } else if (data.status === 'ACTIVE') {
      await Floor.updateMany({ buildingId: id }, { status: 'ACTIVE' });
      await Room.updateMany({ floorId: { $in: floors.map(f => f._id) } }, { status: 'ACTIVE' });
      await Bed.updateMany({ roomId: { $in: rooms.map(r => r._id) }, status: { $ne: BedStatus.OCCUPIED } }, { status: BedStatus.AVAILABLE });
    }
  }

  if (data.genderType || data.isFreshmanPriority !== undefined) {
    const floors = await Floor.find({ buildingId: id }).select('_id').lean();
    const rooms = await Room.find({ floorId: { $in: floors.map(f => f._id) } }).select('_id').lean();
    const roomIds = rooms.map(r => r._id);
    
    if (data.genderType && data.genderType !== 'NO_CHANGE') {
      const occupiedBed = await Bed.findOne({ roomId: { $in: roomIds }, status: BedStatus.OCCUPIED }).lean();
      if (occupiedBed) throw new AppError(400, 'Không thể đổi giới tính vì có phòng đang có sinh viên cư trú', ErrorCode.INVALID_DATA);
      await Room.updateMany({ floorId: { $in: floors.map(f => f._id) } }, { genderType: data.genderType });
    }
    
    if (data.isFreshmanPriority !== undefined && data.isFreshmanPriority !== 'NO_CHANGE') {
      const val = data.isFreshmanPriority === true || data.isFreshmanPriority === 'true';
      await Room.updateMany({ floorId: { $in: floors.map(f => f._id) } }, { isFreshmanPriority: val });
    }
  }

  delete data.genderType;
  delete data.isFreshmanPriority;

  const building = await Building.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!building) throw new NotFoundError('Không tìm thấy tòa nhà', ErrorCode.ROOM_NOT_FOUND);
  return building;
}

export async function deleteBuilding(id: string) {
  const floors = await Floor.find({ buildingId: id }).select('_id').lean();
  const rooms = await Room.find({ floorId: { $in: floors.map(f => f._id) } }).select('_id').lean();
  const occupiedBed = await Bed.findOne({ roomId: { $in: rooms.map(r => r._id) }, status: BedStatus.OCCUPIED }).lean();
  if (occupiedBed) throw new AppError(400, 'Không thể xóa tòa nhà đang có sinh viên ở', ErrorCode.INVALID_DATA);
  
  await Bed.deleteMany({ roomId: { $in: rooms.map(r => r._id) } });
  await Room.deleteMany({ floorId: { $in: floors.map(f => f._id) } });
  await Floor.deleteMany({ buildingId: id });
  const b = await Building.findByIdAndDelete(id);
  if (!b) throw new NotFoundError('Không tìm thấy tòa nhà', ErrorCode.ROOM_NOT_FOUND);
  return { success: true };
}

// ---- Floor ----
export async function listFloors(buildingId: string) {
  return Floor.aggregate([
    { $match: { buildingId: new mongoose.Types.ObjectId(buildingId) } },
    {
      $lookup: {
        from: 'rooms',
        localField: '_id',
        foreignField: 'floorId',
        as: 'rooms'
      }
    },
    {
      $lookup: {
        from: 'beds',
        localField: 'rooms._id',
        foreignField: 'roomId',
        as: 'beds'
      }
    },
    {
      $addFields: {
        stats: {
          roomCount: { $size: '$rooms' },
          bedCount: { $size: '$beds' },
          activeBedCount: {
            $size: { $filter: { input: '$beds', as: 'bed', cond: { $in: ['$$bed.status', ['AVAILABLE', 'OCCUPIED']] } } }
          },
          occupiedBedCount: {
            $size: { $filter: { input: '$beds', as: 'bed', cond: { $eq: ['$$bed.status', 'OCCUPIED'] } } }
          }
        }
      }
    },
    { $project: { rooms: 0, beds: 0 } },
    { $sort: { floorNumber: 1 } }
  ]);
}

export async function createFloor(data: Record<string, unknown>) {
  return Floor.create(data);
}

export async function updateFloor(id: string, data: Record<string, unknown>) {
  if (data.status !== undefined) {
    const rooms = await Room.find({ floorId: id }).select('_id').lean();
    if (data.status === 'MAINTENANCE' || data.status === 'INACTIVE') {
      const occupiedBed = await Bed.findOne({ roomId: { $in: rooms.map(r => r._id) }, status: BedStatus.OCCUPIED }).lean();
      if (occupiedBed) throw new AppError(400, 'Không thể đổi trạng thái tầng đang có sinh viên ở', ErrorCode.INVALID_DATA);
      
      await Room.updateMany({ floorId: id }, { status: data.status });
      await Bed.updateMany({ roomId: { $in: rooms.map(r => r._id) }, status: { $ne: BedStatus.OCCUPIED } }, { status: BedStatus.MAINTENANCE });
    } else if (data.status === 'ACTIVE') {
      await Room.updateMany({ floorId: id }, { status: 'ACTIVE' });
      await Bed.updateMany({ roomId: { $in: rooms.map(r => r._id) }, status: { $ne: BedStatus.OCCUPIED } }, { status: BedStatus.AVAILABLE });
    }
  }

  if (data.genderType || data.isFreshmanPriority !== undefined) {
    const rooms = await Room.find({ floorId: id }).select('_id').lean();
    const roomIds = rooms.map(r => r._id);
    
    if (data.genderType && data.genderType !== 'NO_CHANGE') {
      const occupiedBed = await Bed.findOne({ roomId: { $in: roomIds }, status: BedStatus.OCCUPIED }).lean();
      if (occupiedBed) throw new AppError(400, 'Không thể đổi giới tính vì có phòng đang có sinh viên cư trú', ErrorCode.INVALID_DATA);
      await Room.updateMany({ floorId: id }, { genderType: data.genderType });
    }
    
    if (data.isFreshmanPriority !== undefined && data.isFreshmanPriority !== 'NO_CHANGE') {
      const val = data.isFreshmanPriority === true || data.isFreshmanPriority === 'true';
      await Room.updateMany({ floorId: id }, { isFreshmanPriority: val });
    }
  }

  delete data.genderType;
  delete data.isFreshmanPriority;

  const floor = await Floor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!floor) throw new NotFoundError('Không tìm thấy tầng', ErrorCode.ROOM_NOT_FOUND);
  return floor;
}

export async function deleteFloor(id: string) {
  const rooms = await Room.find({ floorId: id }).select('_id').lean();
  const occupiedBed = await Bed.findOne({ roomId: { $in: rooms.map(r => r._id) }, status: BedStatus.OCCUPIED }).lean();
  if (occupiedBed) throw new AppError(400, 'Không thể xóa tầng đang có sinh viên ở', ErrorCode.INVALID_DATA);
  
  await Bed.deleteMany({ roomId: { $in: rooms.map(r => r._id) } });
  await Room.deleteMany({ floorId: id });
  const f = await Floor.findByIdAndDelete(id);
  if (!f) throw new NotFoundError('Không tìm thấy tầng', ErrorCode.ROOM_NOT_FOUND);
  return { success: true };
}

// ---- Room ----
export async function listRooms(filter: { buildingId?: string; floorId?: string; genderType?: string; status?: string; populate?: boolean }) {
  const query: Record<string, unknown> = {};
  if (filter.buildingId) {
    const floors = await Floor.find({ buildingId: filter.buildingId }).select('_id').lean();
    query.floorId = { $in: floors.map(f => f._id) };
  }
  if (filter.floorId) query.floorId = new mongoose.Types.ObjectId(filter.floorId);
  if (filter.genderType) query.genderType = filter.genderType;
  if (filter.status) query.status = filter.status;

  const pipeline: any[] = [{ $match: query }];
  
  if (filter.populate) {
    pipeline.push({
      $lookup: {
        from: 'floors',
        localField: 'floorId',
        foreignField: '_id',
        as: 'floorId'
      }
    }, {
      $unwind: { path: '$floorId', preserveNullAndEmptyArrays: true }
    }, {
      $lookup: {
        from: 'buildings',
        localField: 'floorId.buildingId',
        foreignField: '_id',
        as: 'floorId.buildingId'
      }
    }, {
      $unwind: { path: '$floorId.buildingId', preserveNullAndEmptyArrays: true }
    });
  }

  pipeline.push({
    $lookup: {
      from: 'beds',
      localField: '_id',
      foreignField: 'roomId',
      as: 'beds'
    }
  }, {
    $lookup: {
      from: 'roomassignments',
      let: { roomId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$roomId', '$$roomId'] },
            status: 'ACTIVE'
          }
        }
      ],
      as: 'activeAssignments'
    }
  }, {
    $addFields: {
      stats: {
        bedCount: { $size: '$beds' },
        activeBedCount: {
          $size: { $filter: { input: '$beds', as: 'bed', cond: { $in: ['$$bed.status', ['AVAILABLE', 'OCCUPIED']] } } }
        },
        occupiedBedCount: {
          $size: { $filter: { input: '$beds', as: 'bed', cond: { $eq: ['$$bed.status', 'OCCUPIED'] } } }
        },
        currentResidentCount: { $size: '$activeAssignments' }
      }
    }
  }, {
    $project: { beds: 0, activeAssignments: 0 }
  }, {
    $sort: { roomNumber: 1 }
  });

  return Room.aggregate(pipeline);
}

export async function createRoom(data: { floorId: string; roomNumber: string; capacity: number; genderType: string; status?: string; isFreshmanPriority?: boolean }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [room] = await Room.create([data], { session });
    const beds = Array.from({ length: data.capacity }, (_, i) => ({
      roomId: room._id,
      bedNumber: `G${i + 1}`,
      status: BedStatus.AVAILABLE,
    }));
    await Bed.insertMany(beds, { session });
    await session.commitTransaction();
    return room;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function updateRoom(id: string, data: Record<string, unknown>) {
  const room = await Room.findById(id);
  if (!room) throw new NotFoundError('Không tìm thấy phòng', ErrorCode.ROOM_NOT_FOUND);

  if (data.status === 'MAINTENANCE' || data.status === 'INACTIVE') {
    const occupiedBed = await Bed.findOne({ roomId: id, status: BedStatus.OCCUPIED }).lean();
    if (occupiedBed) throw new AppError(400, 'Không thể đổi trạng thái phòng đang có sinh viên ở', ErrorCode.INVALID_DATA);
    await Bed.updateMany({ roomId: id }, { status: BedStatus.MAINTENANCE });
  } else if (data.status === 'ACTIVE') {
    await Bed.updateMany({ roomId: id, status: { $ne: BedStatus.OCCUPIED } }, { status: BedStatus.AVAILABLE });
  }

  const oldCapacity = room.capacity;
  Object.assign(room, data);
  await room.save();

  let warning: string | undefined;
  const newCapacity = room.capacity;
  if (newCapacity > oldCapacity) {
    const existingBeds = await Bed.countDocuments({ roomId: id });
    const toCreate = newCapacity - existingBeds;
    if (toCreate > 0) {
      const beds = Array.from({ length: toCreate }, (_, i) => ({
        roomId: room._id,
        bedNumber: `G${existingBeds + i + 1}`,
        status: BedStatus.AVAILABLE,
      }));
      await Bed.insertMany(beds);
    }
  } else if (newCapacity < oldCapacity) {
    warning = `Sức chứa giảm từ ${oldCapacity} xuống ${newCapacity}. Các giường hiện tại KHÔNG bị xóa — vui lòng quản lý giường thủ công nếu cần.`;
  }

  return { room, warning };
}

export async function deleteRoom(id: string) {
  const occupiedBed = await Bed.findOne({ roomId: id, status: BedStatus.OCCUPIED }).lean();
  if (occupiedBed) throw new AppError(400, 'Không thể xóa phòng đang có sinh viên ở', ErrorCode.INVALID_DATA);
  await Bed.deleteMany({ roomId: id });
  const r = await Room.findByIdAndDelete(id);
  if (!r) throw new NotFoundError('Không tìm thấy phòng', ErrorCode.ROOM_NOT_FOUND);
  return { success: true };
}

// ---- Bed ----
export async function listBeds(roomId: string) {
  return Bed.find({ roomId }).sort({ bedNumber: 1 }).lean();
}

export async function createBed(data: { roomId: string }) {
  const room = await Room.findById(data.roomId);
  if (!room) throw new NotFoundError('Không tìm thấy phòng', ErrorCode.ROOM_NOT_FOUND);

  const beds = await Bed.find({ roomId: data.roomId }).select('bedNumber').lean();
  const nextNumber = beds.reduce((max, bed) => {
    const match = String(bed.bedNumber || '').match(/^G(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  const bed = await Bed.create({
    roomId: data.roomId,
    bedNumber: `G${nextNumber}`,
    status: BedStatus.AVAILABLE,
  });

  const bedCount = beds.length + 1;
  if (room.capacity < bedCount) {
    room.capacity = bedCount;
    await room.save();
  }

  return bed;
}

export async function updateBed(id: string, data: { status: string }) {
  const currentBed = await Bed.findById(id);
  if (!currentBed) throw new NotFoundError('Không tìm thấy giường', ErrorCode.BED_NOT_FOUND);
  
  if (currentBed.status === BedStatus.OCCUPIED) {
    throw new AppError(400, 'Giường đang có sinh viên, không thể đổi trạng thái', ErrorCode.INVALID_DATA);
  }
  
  if (data.status === BedStatus.OCCUPIED) {
    throw new AppError(400, 'Không thể gán trạng thái Đã có sinh viên thủ công', ErrorCode.INVALID_DATA);
  }

  const bed = await Bed.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return bed;
}

export async function deleteBed(id: string) {
  const bed = await Bed.findById(id).lean();
  if (!bed) throw new NotFoundError('Không tìm thấy giường', ErrorCode.BED_NOT_FOUND);
  if (bed.status === BedStatus.OCCUPIED) {
    throw new AppError(400, 'Không thể xóa giường đang có sinh viên ở', ErrorCode.INVALID_DATA);
  }
  await Bed.findByIdAndDelete(id);
  return { success: true };
}
