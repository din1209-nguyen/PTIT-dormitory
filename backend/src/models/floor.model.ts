import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface IFloor extends Document {
  buildingId: Types.ObjectId;
  floorNumber: number;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const floorSchema = new Schema<IFloor>(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    floorNumber: { type: Number, required: true },
    description: { type: String },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

floorSchema.index({ buildingId: 1, floorNumber: 1 }, { unique: true });

export const Floor = mongoose.model<IFloor>('Floor', floorSchema);
