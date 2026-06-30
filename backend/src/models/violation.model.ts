import mongoose, { Schema, Types, type Document } from 'mongoose';
import { ViolationStatus } from '../common/constants/enums.js';

export interface IViolation extends Document {
  studentId: Types.ObjectId;
  semesterId?: Types.ObjectId;
  description: string;
  penalty?: string;
  violationDate: Date;
  status: ViolationStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const violationSchema = new Schema<IViolation>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester' },
    description: { type: String, required: true },
    penalty: { type: String },
    violationDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(ViolationStatus), required: true, default: ViolationStatus.RECORDED },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

violationSchema.index({ studentId: 1 });
violationSchema.index({ semesterId: 1 });
violationSchema.index({ status: 1 });
violationSchema.index({ violationDate: -1 });

export const Violation = mongoose.model<IViolation>('Violation', violationSchema);
