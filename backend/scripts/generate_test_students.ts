import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Student } from '../src/models/student.model.js';
import { User } from '../src/models/user.model.js';
import { Gender, ResidenceType } from '../src/common/constants/enums.js';
import { Role } from '../src/common/constants/roles.js';
import { UserStatus } from '../src/common/constants/statuses.js';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const MAJORS = [
  { code: 'CN', name: 'Công nghệ thông tin', dept: 'Công nghệ thông tin' },
  { code: 'AT', name: 'An toàn thông tin', dept: 'An toàn thông tin' },
  { code: 'VT', name: 'Điện tử viễn thông', dept: 'Điện tử viễn thông' },
  { code: 'MR', name: 'Marketing', dept: 'Quản trị kinh doanh' }
];

const COHORTS = [
  { year: '22', className: 'D22' },
  { year: '23', className: 'D23' },
  { year: '24', className: 'D24' },
];

async function generate() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');

  // Cleanup: Delete old mock users and students
  const oldStudents = await Student.find({ email: { $regex: /@example\.com$/ } }, { _id: 1 }).lean();
  const oldStudentIds = oldStudents.map(s => s._id);

  if (oldStudentIds.length > 0) {
    const deleteRecordsResult = await mongoose.model('ResidenceRecord').deleteMany({ studentId: { $in: oldStudentIds } });
    console.log(`Deleted ${deleteRecordsResult.deletedCount} old mock residence records.`);
  }

  const deleteStudentsResult = await Student.deleteMany({ email: { $regex: /@example\.com$/ } });
  console.log(`Deleted ${deleteStudentsResult.deletedCount} old mock students.`);
  
  const deleteUsersResult = await User.deleteMany({ email: { $regex: /@example\.com$/ } });
  console.log(`Deleted ${deleteUsersResult.deletedCount} old mock users.`);

  const usersToInsert = [];
  const studentsToInsert = [];
  const passwordHash = await bcrypt.hash('password123', 12);
  
  // Generate 10 Freshmen (Tân sinh viên K65)
  for (let i = 1; i <= 10; i++) {
    const major = MAJORS[i % MAJORS.length];
    const gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE;
    const code = `N25DC${major.code}${i.toString().padStart(3, '0')}`;
    const email = `${code.toLowerCase()}@example.com`;
    
    const userId = new mongoose.Types.ObjectId();
    
    usersToInsert.push({
      _id: userId,
      username: code,
      email,
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      forcePasswordChange: true
    });

    studentsToInsert.push({
      userId,
      studentCode: code,
      fullName: `Tân Sinh Viên ${i}`,
      gender,
      email,
      className: `D25CQ${major.code}01-N`,
      major: major.name,
      department: major.dept,
      academicYear: 'D25',
      isFreshman: true,
      residenceType: ResidenceType.NOT_RESIDING
    });
  }

  // Generate 30 Seniors
  for (let i = 1; i <= 30; i++) {
    const major = MAJORS[i % MAJORS.length];
    const cohort = COHORTS[i % COHORTS.length];
    const gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE;
    const code = `N${cohort.year}DC${major.code}${i.toString().padStart(3, '0')}`;
    const email = `${code.toLowerCase()}@example.com`;
    
    const userId = new mongoose.Types.ObjectId();
    
    usersToInsert.push({
      _id: userId,
      username: code,
      email,
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      forcePasswordChange: true
    });

    studentsToInsert.push({
      userId,
      studentCode: code,
      fullName: `Sinh Viên Cũ ${i}`,
      gender,
      email,
      className: `D${cohort.year}CQ${major.code}01-N`,
      major: major.name,
      department: major.dept,
      academicYear: cohort.className,
      isFreshman: false,
      residenceType: ResidenceType.NOT_RESIDING
    });
  }

  const studentCodes = studentsToInsert.map(s => s.studentCode);
  await Student.deleteMany({ studentCode: { $in: studentCodes } });
  await User.deleteMany({ username: { $in: studentCodes } });
  
  // Insert to DB
  await User.insertMany(usersToInsert);
  console.log(`Inserted ${usersToInsert.length} new PTITHCM users to DB.`);
  
  await Student.insertMany(studentsToInsert);
  console.log(`Inserted ${studentsToInsert.length} new PTITHCM students to DB.`);

  // Create Excel file
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Danh sach import');
  
  ws.addRow(['Mã sinh viên']);
  
  for (const student of studentsToInsert) {
    ws.addRow([student.studentCode]);
  }

  const filePath = path.join(process.cwd(), '..', 'danh_sach_import_mau.xlsx');
  await wb.xlsx.writeFile(filePath);
  
  console.log(`Excel file created at: ${filePath}`);
  process.exit(0);
}

generate().catch(console.error);
