import mongoose, { Schema, type Document } from 'mongoose';
import { Role } from '../common/constants/roles.js';
import { UserStatus } from '../common/constants/statuses.js';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  email?: string;
  role: Role;
  status: UserStatus;
  tokenVersion: number;
  lastLoginAt?: Date;
  forcePasswordChange?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    role: { type: String, enum: Object.values(Role), required: true, default: Role.STUDENT },
    status: { type: String, enum: Object.values(UserStatus), required: true, default: UserStatus.ACTIVE },
    tokenVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date },
    forcePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
