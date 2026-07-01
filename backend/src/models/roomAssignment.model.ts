import mongoose, { Schema, Types, type Document } from 'mongoose';

export enum RoomAssignmentStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export interface IRoomAssignment extends Document {
  residenceRecordId: Types.ObjectId;
  studentId: Types.ObjectId;
  semesterId: Types.ObjectId;
  roomId: Types.ObjectId;
  bedId: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  assignedAt: Date;
  status: RoomAssignmentStatus;
  studentSnapshot?: Record<string, unknown>;
  roomSnapshot?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const roomAssignmentSchema = new Schema<IRoomAssignment>(
  {
    residenceRecordId: { type: Schema.Types.ObjectId, ref: 'ResidenceRecord', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: Object.values(RoomAssignmentStatus), required: true, default: RoomAssignmentStatus.ACTIVE },
    studentSnapshot: { type: Schema.Types.Mixed },
    roomSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

roomAssignmentSchema.index({ studentId: 1, semesterId: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });
roomAssignmentSchema.index({ bedId: 1, semesterId: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });
roomAssignmentSchema.index({ roomId: 1, semesterId: 1 });
roomAssignmentSchema.index({ semesterId: 1 });
roomAssignmentSchema.index({ status: 1 });

export const RoomAssignment = mongoose.model<IRoomAssignment>('RoomAssignment', roomAssignmentSchema);
