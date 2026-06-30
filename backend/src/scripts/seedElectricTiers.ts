import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ElectricPriceTier } from '../models/electricPriceTier.model.js';

const TIERS = [
  { tierOrder: 1, fromKwh: 0, toKwh: 50, unitPrice: 1786, isActive: true },
  { tierOrder: 2, fromKwh: 50, toKwh: 100, unitPrice: 1844, isActive: true },
  { tierOrder: 3, fromKwh: 100, toKwh: 200, unitPrice: 2014, isActive: true },
  { tierOrder: 4, fromKwh: 200, toKwh: 300, unitPrice: 2536, isActive: true },
  { tierOrder: 5, fromKwh: 300, toKwh: 400, unitPrice: 2834, isActive: true },
  { tierOrder: 6, fromKwh: 400, toKwh: null, unitPrice: 2927, isActive: true },
];

export async function seedElectricTiers() {
  for (const tier of TIERS) {
    await ElectricPriceTier.findOneAndUpdate({ tierOrder: tier.tierOrder }, tier, { upsert: true });
  }
  console.log(`  ✓ ${TIERS.length} electric price tiers`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedElectricTiers();
  await mongoose.disconnect();
  console.log('Done');
}

if (process.argv[1]?.includes('seedElectricTiers')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
