import mongoose, { Schema, type Document } from 'mongoose';

export interface IBuilding extends Document {
  name: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const buildingSchema = new Schema<IBuilding>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

export const Building = mongoose.model<IBuilding>('Building', buildingSchema);
