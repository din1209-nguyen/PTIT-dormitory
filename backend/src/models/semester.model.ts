import mongoose, { Schema, Types, type Document } from 'mongoose';
import { SemesterTerm, SemesterStatus } from '../common/constants/enums.js';

export interface ISemester extends Document {
  name: string;
  term: SemesterTerm;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  status: SemesterStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const semesterSchema = new Schema<ISemester>(
  {
    name: { type: String, required: true, trim: true },
    term: { type: String, enum: Object.values(SemesterTerm), required: true },
    academicYear: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(SemesterStatus), required: true, default: SemesterStatus.UNOPENED },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

semesterSchema.index({ term: 1, academicYear: 1 }, { unique: true });
semesterSchema.index({ status: 1 });
semesterSchema.index({ startDate: 1, endDate: 1 });

export const Semester = mongoose.model<ISemester>('Semester', semesterSchema);
