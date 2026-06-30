import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface IImportRowError extends Document {
  importBatchId: Types.ObjectId;
  rowNumber: number;
  fieldName?: string;
  errorMessage: string;
  rawData?: Record<string, unknown>;
}

const importRowErrorSchema = new Schema<IImportRowError>({
  importBatchId: { type: Schema.Types.ObjectId, ref: 'ImportBatch', required: true },
  rowNumber: { type: Number, required: true },
  fieldName: { type: String },
  errorMessage: { type: String, required: true },
  rawData: { type: Schema.Types.Mixed },
});

importRowErrorSchema.index({ importBatchId: 1 });
importRowErrorSchema.index({ rowNumber: 1 });

export const ImportRowError = mongoose.model<IImportRowError>('ImportRowError', importRowErrorSchema);
