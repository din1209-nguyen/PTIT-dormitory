import mongoose, { Schema, Types, type Document } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../common/constants/enums.js';

export interface IPayment extends Document {
  billId: Types.ObjectId;
  studentId?: Types.ObjectId;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  vnpTxnRef?: string;
  vnpTransactionNo?: string;
  vnpResponseCode?: string;
  vnpPayDate?: string;
  vnpSecureHash?: string;
  vnpRawData?: Record<string, unknown>;
  cashConfirmedBy?: Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    billId: { type: Schema.Types.ObjectId, ref: 'UtilityBill', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    method: { type: String, enum: Object.values(PaymentMethod), required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(PaymentStatus), required: true, default: PaymentStatus.PENDING },
    vnpTxnRef: { type: String },
    vnpTransactionNo: { type: String },
    vnpResponseCode: { type: String },
    vnpPayDate: { type: String },
    vnpSecureHash: { type: String },
    vnpRawData: { type: Schema.Types.Mixed },
    cashConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ vnpTxnRef: 1 }, { unique: true, sparse: true });
paymentSchema.index({ billId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
