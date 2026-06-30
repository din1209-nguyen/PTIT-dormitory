import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface INotificationReceiver extends Document {
  notificationId: Types.ObjectId;
  studentId: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
}

const notificationReceiverSchema = new Schema<INotificationReceiver>({
  notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  isRead: { type: Boolean, required: true, default: false },
  readAt: { type: Date },
});

notificationReceiverSchema.index({ notificationId: 1, studentId: 1 }, { unique: true });
notificationReceiverSchema.index({ studentId: 1, isRead: 1 });

export const NotificationReceiver = mongoose.model<INotificationReceiver>('NotificationReceiver', notificationReceiverSchema);
