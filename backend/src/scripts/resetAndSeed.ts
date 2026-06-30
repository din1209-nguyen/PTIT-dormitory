import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { seedPermissions } from './seedPermissions.js';
import { seedConfigs } from './seedConfigs.js';
import { seedElectricTiers } from './seedElectricTiers.js';
import { seedDormitory } from './seedDormitory.js';
import { seedUsersAndStudents } from './seedUsers.js';
import { ensureUpcomingSemesters } from '../modules/semesters/semester.service.js';
import { seedRealisticTransactions } from './seedRealisticData.js';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resetAndSeed() {
  await mongoose.connect(env.MONGODB_URI);
  while (!mongoose.connection.db) {
    await new Promise(r => setTimeout(r, 100));
  }
  const dbName = mongoose.connection.db.databaseName;

  console.log('');
  console.log('⚠️  CẢNH BÁO: Toàn bộ database sẽ bị XÓA và seed lại từ đầu!');
  console.log(`   Database: ${dbName}`);
  console.log('   Nhấn Ctrl+C để hủy...');
  console.log('');

  for (let i = 3; i > 0; i--) {
    process.stdout.write(`   ${i}...\r`);
    await sleep(1000);
  }
  console.log('');

  console.log('🗑️  Dropping database...');
  await mongoose.connection.db?.dropDatabase();
  console.log('   Database đã được xóa sạch.\n');

  console.log('🌱 Seeding dữ liệu...\n');

  console.log('[1/5] Permissions');
  await seedPermissions();

  console.log('[2/5] System Configs');
  await seedConfigs();

  console.log('[3/5] Electric Price Tiers');
  await seedElectricTiers();

  console.log('[4/5] Dormitory (Buildings, Floors, Rooms, Beds)');
  await seedDormitory();

  console.log('[5/6] Users & Students');
  await seedUsersAndStudents();

  console.log('[6/7] Semesters (auto-generated)');
  await ensureUpcomingSemesters();
  console.log('  ✓ Kỳ lưu trú tự động');

  console.log('\n[7/7] Generating Realistic Transactions (Assignments, Bills, Payments, Violations...)');
  await seedRealisticTransactions();

  console.log('\n✅ Reset & Seed hoàn tất!');
  console.log('   Admin:   admin / (xem .env SEED_ADMIN_PASSWORD)');
  console.log('   Manager: manager / manager123');
  console.log('   Student: N21DCCN001 / student123 (và 24 SV khác)\n');

  await mongoose.disconnect();
}

resetAndSeed().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
