import mongoose, { Schema, Types, type Document } from 'mongoose';
import { ResidenceStatus } from '../common/constants/enums.js';

export interface IResidenceRecord extends Document {
  studentId: Types.ObjectId;
  semesterId: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  registeredAt: Date;
  status: ResidenceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const residenceRecordSchema = new Schema<IResidenceRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    registeredAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: Object.values(ResidenceStatus), required: true, default: ResidenceStatus.PREPARING },
  },
  { timestamps: true },
);

residenceRecordSchema.index({ studentId: 1, semesterId: 1 }, { unique: true });
residenceRecordSchema.index({ semesterId: 1 });
residenceRecordSchema.index({ status: 1 });
residenceRecordSchema.index({ registeredAt: 1 });

export const ResidenceRecord = mongoose.model<IResidenceRecord>('ResidenceRecord', residenceRecordSchema);
