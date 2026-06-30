import mongoose, { Schema, type Document } from 'mongoose';

export interface IPermission extends Document {
  code: string;
  description?: string;
  createdAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
