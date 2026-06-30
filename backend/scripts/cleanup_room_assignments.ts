import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { RoomAssignment } from '../src/models/roomAssignment.model.js';
import { Student } from '../src/models/student.model.js';

async function cleanupRoomAssignments() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');

  const assignments = await RoomAssignment.find({});
  let deletedCount = 0;
  for (const assignment of assignments) {
    const student = await Student.findById(assignment.studentId);
    if (!student) {
      await RoomAssignment.deleteOne({ _id: assignment._id });
      deletedCount++;
    }
  }
  console.log(`Deleted ${deletedCount} orphaned room assignments.`);
  
  process.exit(0);
}
cleanupRoomAssignments().catch(console.error);
