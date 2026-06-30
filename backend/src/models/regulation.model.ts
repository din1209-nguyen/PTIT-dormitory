import mongoose, { Schema, Types, type Document } from 'mongoose';
import { RegulationStatus } from '../common/constants/enums.js';

export interface IRegulation extends Document {
  title: string;
  content: string;
  status: RegulationStatus;
  createdBy?: Types.ObjectId;
  publishedBy?: Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const regulationSchema = new Schema<IRegulation>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    status: { type: String, enum: Object.values(RegulationStatus), required: true, default: RegulationStatus.DRAFT },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

regulationSchema.index({ status: 1 });

export const Regulation = mongoose.model<IRegulation>('Regulation', regulationSchema);
