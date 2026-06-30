import mongoose, { Schema, Types, type Document } from 'mongoose';
import { RoomGenderType, RoomStatus } from '../common/constants/enums.js';

export interface IRoom extends Document {
  floorId: Types.ObjectId;
  roomNumber: string;
  capacity: number;
  genderType: RoomGenderType;
  status: RoomStatus;
  isFreshmanPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    roomNumber: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, default: 8 },
    genderType: { type: String, enum: Object.values(RoomGenderType), required: true },
    status: { type: String, enum: Object.values(RoomStatus), required: true, default: RoomStatus.ACTIVE },
    isFreshmanPriority: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

roomSchema.index({ floorId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ genderType: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ isFreshmanPriority: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);
