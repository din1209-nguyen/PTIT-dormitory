import mongoose, { Schema, Types, type Document } from 'mongoose';
import { NotificationScope, NotificationType } from '../common/constants/enums.js';

export interface INotification extends Document {
  title: string;
  content: string;
  scope: NotificationScope;
  type: NotificationType;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    scope: { type: String, enum: Object.values(NotificationScope), required: true, default: NotificationScope.GENERAL },
    type: { type: String, enum: Object.values(NotificationType), required: true, default: NotificationType.GENERAL },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ scope: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
