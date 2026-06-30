import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Student } from '../src/models/student.model.js';

async function fix() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to DB');
    
    const students = await Student.find();
    let updatedCount = 0;
    
    for (const s of students) {
      if (s.studentCode) {
        const match = s.studentCode.match(/^[a-zA-Z]{1,2}(\d{2})/);
        if (match) {
          const correctCohort = `D${match[1]}`;
          if (s.academicYear !== correctCohort) {
            s.academicYear = correctCohort;
            await s.save();
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`Successfully fixed academicYear for ${updatedCount} students.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
