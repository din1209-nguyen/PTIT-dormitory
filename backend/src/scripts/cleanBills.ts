import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UtilityUsage } from '../models/utilityUsage.model.js';
import { UtilityBill } from '../models/utilityBill.model.js';
import { UtilityBillMember } from '../models/utilityBillMember.model.js';
import { Payment } from '../models/payment.model.js';

async function main() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Cleaning UtilityUsages...');
    await UtilityUsage.deleteMany({});
    
    console.log('Cleaning UtilityBills...');
    await UtilityBill.deleteMany({});

    console.log('Cleaning UtilityBillMembers...');
    await UtilityBillMember.deleteMany({});

    console.log('Cleaning Payments...');
    await Payment.deleteMany({});

    console.log('✅ All utility bills, usages, members and payments have been cleaned successfully!');
  } catch (error) {
    console.error('Error cleaning bills:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

main();
