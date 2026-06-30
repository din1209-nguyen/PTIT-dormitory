import mongoose, { Schema, Types, type Document } from 'mongoose';

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export interface IImportBatch extends Document {
  semesterId: Types.ObjectId;
  fileName?: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: ImportStatus;
  errorMessage?: string;
  importedBy?: Types.ObjectId;
  finishedAt?: Date;
  createdAt: Date;
}

const importBatchSchema = new Schema<IImportBatch>(
  {
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    fileName: { type: String },
    totalRows: { type: Number, required: true, default: 0 },
    successRows: { type: Number, required: true, default: 0 },
    failedRows: { type: Number, required: true, default: 0 },
    status: { type: String, enum: Object.values(ImportStatus), required: true, default: ImportStatus.PENDING },
    errorMessage: { type: String },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finishedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

importBatchSchema.index({ semesterId: 1 });
importBatchSchema.index({ status: 1 });
importBatchSchema.index({ createdAt: -1 });

export const ImportBatch = mongoose.model<IImportBatch>('ImportBatch', importBatchSchema);
