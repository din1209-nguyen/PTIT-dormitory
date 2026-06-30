import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { autoAssignRooms } from './src/modules/roomAssignments/roomAssignment.service';
import { Semester } from './src/models/semester.model';

dotenv.config({ path: path.join(__dirname, 'src', 'config', '.env') });
dotenv.config();

async function testAutoAssign() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ktx');
  console.log('Connected to MongoDB');

  const semester = await Semester.findOne({ status: 'PREPARING' });
  if (!semester) {
    console.log('No PREPARING semester found');
    process.exit(1);
  }

  console.log('Testing with semester:', semester._id);
  
  try {
    const records = await mongoose.connection.db.collection('residencerecords').find({ semesterId: semester._id }).toArray();
    console.log('Total ResidenceRecords:', records.length);
    const assignments = await mongoose.connection.db.collection('roomassignments').find({ semesterId: semester._id }).toArray();
    console.log('Total RoomAssignments (all statuses):', assignments.length);
    console.log('Active RoomAssignments:', assignments.filter(a => a.status === 'ACTIVE').length);

    const result = await autoAssignRooms(semester._id.toString(), new mongoose.Types.ObjectId().toString());
    console.log('Auto assign result:', result);
  } catch (err) {
    console.error('Error in autoAssignRooms:', err);
  }
  
  process.exit(0);
}

testAutoAssign();
