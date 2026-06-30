import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { SystemConfig } from '../models/systemConfig.model.js';
import { ConfigValueType } from '../common/constants/enums.js';

const CONFIGS = [
  { configKey: 'faculty_list', configValue: '["Công nghệ thông tin","Viễn thông","Đa phương tiện","Kế toán","Kỹ thuật Điện tử","Quản trị kinh doanh"]', valueType: ConfigValueType.JSON, description: 'Danh sách khoa' },
  { configKey: 'free_water_quota', configValue: '3', valueType: ConfigValueType.NUMBER, description: 'Số m³ nước miễn phí/phòng/tháng' },
  { configKey: 'water_unit_price', configValue: '8500', valueType: ConfigValueType.NUMBER, description: 'Đơn giá nước (đồng/m³)' },
  { configKey: 'electric_vat_rate', configValue: '0.1', valueType: ConfigValueType.NUMBER, description: 'Thuế VAT điện (10%)' },
  { configKey: 'payment_due_days', configValue: '10', valueType: ConfigValueType.NUMBER, description: 'Số ngày hạn thanh toán từ đầu tháng sau' },
  { configKey: 'residence_end_reminder_days', configValue: '7', valueType: ConfigValueType.NUMBER, description: 'Số ngày nhắc trước khi hết hạn lưu trú' },
  { configKey: 'freshman_priority_buildings', configValue: '["J"]', valueType: ConfigValueType.JSON, description: 'Dãy ưu tiên tân sinh viên' },
  { configKey: 'freshman_priority_room_count', configValue: '2', valueType: ConfigValueType.NUMBER, description: 'Số phòng đầu mỗi tầng giữ cho tân SV' },
  { configKey: 'freshman_cohort_years', configValue: '["D24"]', valueType: ConfigValueType.JSON, description: 'Các khóa được coi là tân sinh viên (VD: D24, D25)' },
];

export async function seedConfigs() {
  for (const cfg of CONFIGS) {
    await SystemConfig.findOneAndUpdate({ configKey: cfg.configKey }, cfg, { upsert: true });
  }
  console.log(`  ✓ ${CONFIGS.length} system configs`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedConfigs();
  await mongoose.disconnect();
  console.log('Done');
}

if (process.argv[1]?.includes('seedConfigs')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
