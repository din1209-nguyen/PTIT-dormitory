import mongoose, { Schema, Types, type Document } from 'mongoose';
import { BedStatus } from '../common/constants/enums.js';

export interface IBed extends Document {
  roomId: Types.ObjectId;
  bedNumber: string;
  status: BedStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bedSchema = new Schema<IBed>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(BedStatus), required: true, default: BedStatus.AVAILABLE },
  },
  { timestamps: true },
);

bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ status: 1 });

export const Bed = mongoose.model<IBed>('Bed', bedSchema);
