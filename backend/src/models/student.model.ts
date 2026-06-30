import mongoose, { Schema, Types, type Document } from 'mongoose';
import { Gender, ResidenceType } from '../common/constants/enums.js';

export interface IStudent extends Document {
  userId?: Types.ObjectId;
  studentCode: string;
  fullName: string;
  dateOfBirth?: Date;
  gender: Gender;
  email: string;
  phone?: string;
  address?: string;
  className?: string;
  major?: string;
  department?: string;
  academicYear?: string;
  isFreshman: boolean;
  residenceType: ResidenceType;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    studentCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: Object.values(Gender), required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String },
    className: { type: String, trim: true },
    major: { type: String, trim: true },
    department: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    isFreshman: { type: Boolean, required: true, default: false },
    residenceType: { type: String, enum: Object.values(ResidenceType), required: true, default: ResidenceType.NOT_RESIDING },
  },
  { timestamps: true },
);

studentSchema.index({ email: 1 });
studentSchema.index({ gender: 1 });
studentSchema.index({ className: 1 });
studentSchema.index({ major: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ residenceType: 1 });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
