import mongoose, { Schema, Types, type Document } from 'mongoose';
import { Role } from '../common/constants/roles.js';

export interface IRolePermission extends Document {
  role: Role;
  permissionId: Types.ObjectId;
}

const rolePermissionSchema = new Schema<IRolePermission>({
  role: { type: String, enum: Object.values(Role), required: true },
  permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
});

rolePermissionSchema.index({ role: 1, permissionId: 1 }, { unique: true });

export const RolePermission = mongoose.model<IRolePermission>('RolePermission', rolePermissionSchema);
