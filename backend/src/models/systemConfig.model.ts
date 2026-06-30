import mongoose, { Schema, Types, type Document } from 'mongoose';
import { ConfigValueType } from '../common/constants/enums.js';

export interface ISystemConfig extends Document {
  configKey: string;
  configValue: string;
  valueType: ConfigValueType;
  description?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    configKey: { type: String, required: true, unique: true },
    configValue: { type: String, required: true },
    valueType: { type: String, enum: Object.values(ConfigValueType), required: true, default: ConfigValueType.STRING },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export function parseConfigValue(config: Pick<ISystemConfig, 'configValue' | 'valueType'>): unknown {
  switch (config.valueType) {
    case ConfigValueType.NUMBER: return Number(config.configValue);
    case ConfigValueType.BOOLEAN: return config.configValue === 'true';
    case ConfigValueType.JSON: return JSON.parse(config.configValue);
    default: return config.configValue;
  }
}

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
