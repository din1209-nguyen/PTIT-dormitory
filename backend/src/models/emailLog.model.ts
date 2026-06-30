import mongoose, { Schema, type Document } from 'mongoose';
import { EmailStatus } from '../common/constants/enums.js';

export interface IEmailLog extends Document {
  recipientEmail: string;
  subject: string;
  content: string;
  status: EmailStatus;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    recipientEmail: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    status: { type: String, enum: Object.values(EmailStatus), required: true, default: EmailStatus.PENDING },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  { timestamps: true },
);

emailLogSchema.index({ recipientEmail: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ createdAt: -1 });

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
