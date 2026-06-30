import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface IUtilityUsage extends Document {
  roomId: Types.ObjectId;
  month: number;
  year: number;
  oldElectricity: number;
  newElectricity: number;
  oldWater: number;
  newWater: number;
  recordedBy?: Types.ObjectId;
  recordedAt: Date;
}

const utilityUsageSchema = new Schema<IUtilityUsage>({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  oldElectricity: { type: Number, required: true, default: 0 },
  newElectricity: { type: Number, required: true },
  oldWater: { type: Number, required: true, default: 0 },
  newWater: { type: Number, required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, required: true, default: Date.now },
});

utilityUsageSchema.index({ roomId: 1, month: 1, year: 1 }, { unique: true });
utilityUsageSchema.index({ year: 1, month: 1 });

export const UtilityUsage = mongoose.model<IUtilityUsage>('UtilityUsage', utilityUsageSchema);
