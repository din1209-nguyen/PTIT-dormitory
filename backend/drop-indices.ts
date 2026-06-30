import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, 'src', 'config', '.env') });
dotenv.config();

async function fixIndices() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ktx');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('roomassignments');
  
  try {
    await collection.dropIndex('studentId_1_semesterId_1');
    console.log('Dropped studentId_1_semesterId_1');
  } catch (err: any) {
    console.log('Index studentId_1_semesterId_1 not found or error:', err.message);
  }

  try {
    await collection.dropIndex('bedId_1_semesterId_1');
    console.log('Dropped bedId_1_semesterId_1');
  } catch (err: any) {
    console.log('Index bedId_1_semesterId_1 not found or error:', err.message);
  }

  console.log('Done dropping old indices');
  process.exit(0);
}

fixIndices();
