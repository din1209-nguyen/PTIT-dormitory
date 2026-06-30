import mongoose, { Schema, Types, type Document } from 'mongoose';
import { RequestType, RequestStatus } from '../common/constants/enums.js';

export interface IStudentRequest extends Document {
  studentId: Types.ObjectId;
  type: RequestType;
  title: string;
  content: string;
  status: RequestStatus;
  managerNote?: string;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentRequestSchema = new Schema<IStudentRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    type: { type: String, enum: Object.values(RequestType), required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    status: { type: String, enum: Object.values(RequestStatus), required: true, default: RequestStatus.PENDING },
    managerNote: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

studentRequestSchema.index({ studentId: 1 });
studentRequestSchema.index({ type: 1 });
studentRequestSchema.index({ status: 1 });
studentRequestSchema.index({ createdAt: -1 });

export const StudentRequest = mongoose.model<IStudentRequest>('StudentRequest', studentRequestSchema);
