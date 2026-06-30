import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { UtilityBill } from './src/models/utilityBill.model.js';
import { UtilityBillMember } from './src/models/utilityBillMember.model.js';
import { BillMemberStatus } from './src/common/constants/enums.js';

async function fix() {
  await mongoose.connect(env.MONGODB_URI);
  
  // Find all cancelled bills
  const cancelledBills = await UtilityBill.find({ status: 'CANCELLED' }).select('_id').lean();
  const cancelledBillIds = cancelledBills.map(b => b._id);
  
  if (cancelledBillIds.length > 0) {
    const result = await UtilityBillMember.updateMany(
      { billId: { $in: cancelledBillIds } },
      { $set: { status: BillMemberStatus.CANCELLED } }
    );
    console.log('Updated cancelled members:', result.modifiedCount);
  } else {
    console.log('No cancelled bills found');
  }
  
  process.exit(0);
}
fix();
