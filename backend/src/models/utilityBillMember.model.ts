import mongoose, { Schema, Types, type Document } from 'mongoose';
import { BillMemberStatus } from '../common/constants/enums.js';

export interface IUtilityBillMember extends Document {
  billId: Types.ObjectId;
  studentId: Types.ObjectId;
  amountShare: number;
  status: BillMemberStatus;
  paidAt?: Date;
}

const utilityBillMemberSchema = new Schema<IUtilityBillMember>({
  billId: { type: Schema.Types.ObjectId, ref: 'UtilityBill', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  amountShare: { type: Number, required: true, default: 0 },
  status: { type: String, enum: Object.values(BillMemberStatus), required: true, default: BillMemberStatus.UNPAID },
  paidAt: { type: Date },
});

utilityBillMemberSchema.index({ billId: 1, studentId: 1 }, { unique: true });
utilityBillMemberSchema.index({ studentId: 1, status: 1 });

export const UtilityBillMember = mongoose.model<IUtilityBillMember>('UtilityBillMember', utilityBillMemberSchema);
