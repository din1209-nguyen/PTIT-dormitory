import mongoose, { Schema, Types, type Document } from 'mongoose';
import { BillStatus } from '../common/constants/enums.js';

export interface IUtilityBill extends Document {
  roomId: Types.ObjectId;
  semesterId?: Types.ObjectId;
  usageId?: Types.ObjectId;
  month: number;
  year: number;
  electricityUsage: number;
  waterUsage: number;
  electricityCost: number;
  waterCost: number;
  vatAmount: number;
  totalCost: number;
  status: BillStatus;
  dueDate: Date;
  paymentDate?: Date;
  priceConfigSnapshot?: Record<string, unknown>;
  roomMemberSnapshot?: Array<Record<string, unknown>>;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const utilityBillSchema = new Schema<IUtilityBill>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester' },
    usageId: { type: Schema.Types.ObjectId, ref: 'UtilityUsage', unique: true, sparse: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    electricityUsage: { type: Number, required: true, default: 0 },
    waterUsage: { type: Number, required: true, default: 0 },
    electricityCost: { type: Number, required: true, default: 0 },
    waterCost: { type: Number, required: true, default: 0 },
    vatAmount: { type: Number, required: true, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    status: { type: String, enum: Object.values(BillStatus), required: true, default: BillStatus.UNPAID },
    dueDate: { type: Date, required: true },
    paymentDate: { type: Date },
    priceConfigSnapshot: { type: Schema.Types.Mixed },
    roomMemberSnapshot: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

utilityBillSchema.index(
  { roomId: 1, month: 1, year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [BillStatus.UNPAID, BillStatus.PAID, BillStatus.OVERDUE] },
    },
  },
);
utilityBillSchema.index({ semesterId: 1 });
utilityBillSchema.index({ status: 1 });
utilityBillSchema.index({ dueDate: 1 });

export const UtilityBill = mongoose.model<IUtilityBill>('UtilityBill', utilityBillSchema);
