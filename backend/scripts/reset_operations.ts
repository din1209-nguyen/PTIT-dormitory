import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktx_db';

// Models
import { RoomAssignment } from '../src/models/roomAssignment.model';
import { ResidenceRecord } from '../src/models/residenceRecord.model';
import { ImportBatch } from '../src/models/importBatch.model';
import { ImportRowError } from '../src/models/importRowError.model';
import { UtilityBill } from '../src/models/utilityBill.model';
import { UtilityBillMember } from '../src/models/utilityBillMember.model';
import { Student } from '../src/models/student.model';
import { Bed } from '../src/models/bed.model';

async function resetOperations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB for reset operations');

    // 1. Delete all operational data
    const ops = [
      RoomAssignment.deleteMany({}),
      ResidenceRecord.deleteMany({}),
      ImportBatch.deleteMany({}),
      ImportRowError.deleteMany({}),
      UtilityBill.deleteMany({}),
      UtilityBillMember.deleteMany({})
    ];
    await Promise.all(ops);
    console.log('Deleted all RoomAssignments, ResidenceRecords, ImportBatches, ImportRowErrors, UtilityBills, UtilityBillMembers.');

    // 2. Reset Student status
    const studentUpdate = await Student.updateMany(
      { residenceType: { $ne: 'NOT_RESIDING' } },
      { $set: { residenceType: 'NOT_RESIDING' } }
    );
    console.log(`Reset ${studentUpdate.modifiedCount} students to NOT_RESIDING.`);

    // 3. Reset Bed status
    const bedUpdate = await Bed.updateMany(
      { status: { $ne: 'AVAILABLE' } },
      { $set: { status: 'AVAILABLE', studentId: null, assignedAt: null } }
    );
    console.log(`Reset ${bedUpdate.modifiedCount} beds to AVAILABLE.`);

    console.log('Reset operations completed successfully!');
  } catch (err) {
    console.error('Error during reset operations:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

resetOperations();
