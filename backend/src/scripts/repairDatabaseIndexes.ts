import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import '../models/index.js';
import { Building } from '../models/building.model.js';
import { Floor } from '../models/floor.model.js';
import { UtilityBill } from '../models/utilityBill.model.js';
import { BillStatus } from '../common/constants/enums.js';

async function assertNoDuplicateActiveBills() {
  const duplicates = await UtilityBill.aggregate([
    { $match: { status: { $in: [BillStatus.UNPAID, BillStatus.PAID, BillStatus.OVERDUE] } } },
    {
      $group: {
        _id: { roomId: '$roomId', month: '$month', year: '$year' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  if (duplicates.length > 0) {
    throw new Error(`Found duplicate non-cancelled utility bills. Resolve these before syncing indexes: ${JSON.stringify(duplicates)}`);
  }
}

async function dropLegacyUtilityBillIndex() {
  const indexes = await UtilityBill.collection.indexes();
  const legacy = indexes.find((index) => index.name === 'roomId_1_month_1_year_1');

  if (!legacy) return;

  const hasExpectedPartialUnique =
    legacy.unique === true
    && JSON.stringify(legacy.partialFilterExpression) === JSON.stringify({
      status: { $in: [BillStatus.UNPAID, BillStatus.PAID, BillStatus.OVERDUE] },
    });

  if (!hasExpectedPartialUnique) {
    await UtilityBill.collection.dropIndex('roomId_1_month_1_year_1');
    console.log('Dropped legacy utility bill room/month/year index');
  }
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await Building.updateMany({ status: { $exists: false } }, { $set: { status: 'ACTIVE' }, $unset: { isActive: '' } });
  await Building.updateMany({ isActive: { $exists: true } }, { $unset: { isActive: '' } });
  await Floor.updateMany({ status: { $exists: false } }, { $set: { status: 'ACTIVE' } });

  await assertNoDuplicateActiveBills();
  await dropLegacyUtilityBillIndex();

  await Promise.all([
    Building.syncIndexes(),
    Floor.syncIndexes(),
    UtilityBill.syncIndexes(),
  ]);

  console.log('Database indexes repaired successfully');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
