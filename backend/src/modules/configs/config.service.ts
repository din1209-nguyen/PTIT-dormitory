import { SystemConfig, parseConfigValue } from '../../models/systemConfig.model.js';
import { Student } from '../../models/student.model.js';
import { NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { logActivity } from '../../common/utils/auditLogger.js';
import { AuditAction, ConfigValueType } from '../../common/constants/enums.js';

const DEFAULT_NUMERIC_CONFIGS: Record<string, { value: string; description: string }> = {
  free_water_quota: { value: '3', description: 'Dinh muc nuoc mien phi' },
  water_unit_price: { value: '8500', description: 'Don gia nuoc' },
  electric_vat_rate: { value: '0.1', description: 'VAT dien mac dinh 10%' },
  water_vat_rate: { value: '0.05', description: 'VAT nuoc sach mac dinh 5%' },
  wastewater_fee_rate: { value: '0.1', description: 'Phi thoat nuoc/xu ly nuoc thai mac dinh 10%' },
};

export async function listConfigs() {
  const configs = await SystemConfig.find().sort({ configKey: 1 }).lean();
  return configs.map((c) => ({
    _id: c._id,
    configKey: c.configKey,
    configValue: c.configValue,
    valueType: c.valueType,
    description: c.description,
    parsedValue: parseConfigValue(c),
  }));
}

export async function getConfig(key: string) {
  let config = await SystemConfig.findOne({ configKey: key });
  if (!config && DEFAULT_NUMERIC_CONFIGS[key]) {
    const defaults = DEFAULT_NUMERIC_CONFIGS[key];
    config = await SystemConfig.create({
      configKey: key,
      configValue: defaults.value,
      valueType: ConfigValueType.NUMBER,
      description: defaults.description,
    });
  }
  if (!config) throw new NotFoundError(`Không tìm thấy cấu hình "${key}"`, ErrorCode.INTERNAL_SERVER_ERROR);
  return { ...config.toObject(), parsedValue: parseConfigValue(config) };
}

export async function updateConfig(key: string, value: string, updatedBy: string) {
  const old = await SystemConfig.findOne({ configKey: key });
  const defaults = DEFAULT_NUMERIC_CONFIGS[key];
  const config = await SystemConfig.findOneAndUpdate(
    { configKey: key },
    {
      configValue: value,
      updatedBy,
      ...(old ? {} : {
        valueType: defaults ? ConfigValueType.NUMBER : ConfigValueType.STRING,
        description: defaults?.description,
      }),
    },
    { new: true, runValidators: true, upsert: !!defaults },
  );
  if (!config) throw new NotFoundError(`Không tìm thấy cấu hình "${key}"`, ErrorCode.INTERNAL_SERVER_ERROR);

  if (key === 'freshman_cohort_years') {
    try {
      const years = parseConfigValue(config) as string[];
      if (Array.isArray(years)) {
        await Student.updateMany({ academicYear: { $in: years } }, { isFreshman: true });
        await Student.updateMany({ academicYear: { $nin: years } }, { isFreshman: false });
      }
    } catch (error) {
      console.error('Lỗi khi đồng bộ trạng thái Tân sinh viên:', error);
    }
  }

  logActivity({
    userId: updatedBy,
    action: AuditAction.CONFIG_UPDATE,
    entityName: 'SystemConfig',
    description: `Cập nhật ${key}`,
    oldValue: { value: old?.configValue },
    newValue: { value },
  });
  return { ...config.toObject(), parsedValue: parseConfigValue(config) };
}

export async function getFaculties(): Promise<string[]> {
  const config = await SystemConfig.findOne({ configKey: 'faculty_list' });
  if (!config) return [];
  return parseConfigValue(config) as string[];
}
