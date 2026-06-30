import mongoose, { Schema, type Document } from 'mongoose';

export interface IElectricPriceTier extends Document {
  tierOrder: number;
  fromKwh: number;
  toKwh: number | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const electricPriceTierSchema = new Schema<IElectricPriceTier>(
  {
    tierOrder: { type: Number, required: true },
    fromKwh: { type: Number, required: true },
    toKwh: { type: Number, default: null },
    unitPrice: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

electricPriceTierSchema.index({ tierOrder: 1 }, { unique: true });
electricPriceTierSchema.index({ isActive: 1 });

export const ElectricPriceTier = mongoose.model<IElectricPriceTier>('ElectricPriceTier', electricPriceTierSchema);
