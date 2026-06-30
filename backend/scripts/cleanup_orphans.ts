import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { ResidenceRecord } from '../src/models/residenceRecord.model.js';
import { Student } from '../src/models/student.model.js';

async function cleanup() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');

  const records = await ResidenceRecord.find({});
  let deletedCount = 0;
  for (const record of records) {
    const student = await Student.findById(record.studentId);
    if (!student) {
      await ResidenceRecord.deleteOne({ _id: record._id });
      deletedCount++;
    }
  }
  console.log(`Deleted ${deletedCount} orphaned residence records.`);
  
  process.exit(0);
}
cleanup().catch(console.error);
