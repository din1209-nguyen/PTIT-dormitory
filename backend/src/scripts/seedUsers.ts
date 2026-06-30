import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Student } from '../models/student.model.js';
import { Role } from '../common/constants/roles.js';
import { UserStatus } from '../common/constants/statuses.js';
import { Gender, ResidenceType } from '../common/constants/enums.js';

const DEMO_USERS = [
  {
    username: env.SEED_ADMIN_USERNAME || 'admin',
    email: env.SEED_ADMIN_EMAIL || 'admin@ptit.edu.vn',
    password: env.SEED_ADMIN_PASSWORD || 'admin123',
    role: Role.ADMIN,
  },
  {
    username: 'manager',
    email: 'manager@ptithcm.edu.vn',
    password: 'manager123',
    role: Role.MANAGER,
  },
];

const MAJORS = [
  { code: 'CN', name: 'Công nghệ thông tin', dept: 'Công nghệ thông tin' },
  { code: 'AT', name: 'An toàn thông tin', dept: 'Công nghệ thông tin' },
  { code: 'VT', name: 'Kỹ thuật điện tử viễn thông', dept: 'Viễn thông' },
  { code: 'DT', name: 'Kỹ thuật điện tử', dept: 'Kỹ thuật Điện tử' },
  { code: 'PT', name: 'Công nghệ đa phương tiện', dept: 'Đa phương tiện' },
  { code: 'KT', name: 'Kế toán', dept: 'Kế toán' },
  { code: 'QT', name: 'Quản trị kinh doanh', dept: 'Quản trị kinh doanh' },
  { code: 'MR', name: 'Marketing', dept: 'Quản trị kinh doanh' }
];

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE_NAMES_MALE = ['Văn', 'Hữu', 'Đức', 'Công', 'Minh', 'Quang', 'Thanh', 'Khắc', 'Thế', 'Quốc'];
const MIDDLE_NAMES_FEMALE = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Hoài', 'Mai', 'Thùy', 'Kim', 'Bích', 'Diễm'];
const FIRST_NAMES_MALE = ['Hùng', 'Tuấn', 'Anh', 'Phúc', 'Bảo', 'Khôi', 'Nam', 'Vinh', 'Phát', 'Thành', 'Tùng', 'Đại', 'Long', 'Quân', 'Khoa', 'Kiên', 'Hải', 'Sơn', 'Đạt'];
const FIRST_NAMES_FEMALE = ['Mai', 'Hồng', 'Lan', 'Dung', 'Ánh', 'Trúc', 'Ngân', 'Phương', 'Linh', 'Hạnh', 'Ngọc', 'Nhung', 'Trang', 'Hoa', 'Thảo', 'Nga', 'My', 'Vy', 'Tiên'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFullName(gender: Gender): string {
  const lastName = getRandomElement(LAST_NAMES);
  const isMale = gender === Gender.MALE;
  const middleName = isMale ? getRandomElement(MIDDLE_NAMES_MALE) : getRandomElement(MIDDLE_NAMES_FEMALE);
  const firstName = isMale ? getRandomElement(FIRST_NAMES_MALE) : getRandomElement(FIRST_NAMES_FEMALE);
  return `${lastName} ${middleName} ${firstName}`;
}

function generateFakeStudents() {
  const students = [];
  const years = [21, 22, 23, 24]; // Khoá D21 đến D24

  for (const year of years) {
    for (const major of MAJORS) {
      const numStudents = 40; // Seed 40 sinh viên cho mỗi ngành, mỗi khoá (khoảng 1280 SV)
      for (let i = 1; i <= numStudents; i++) {
        const sequence = i.toString().padStart(3, '0');
        const studentCode = `N${year}DC${major.code}${sequence}`;
        const classNum = (i % 2) + 1;
        const className = `D${year}CQ${major.code}0${classNum}-N`;

        const gender = Math.random() > 0.4 ? Gender.MALE : Gender.FEMALE;

        students.push({
          studentCode,
          fullName: generateFullName(gender),
          gender,
          className,
          major: major.name,
          academicYear: `D${year}`,
          department: major.dept,
          isFreshman: year === 24
        });
      }
    }
  }
  return students;
}

const SEED_STUDENTS = generateFakeStudents();

export async function seedUsersAndStudents() {
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    if (u.role === Role.ADMIN) {
      await User.findOneAndUpdate(
        { username: u.username },
        { email: u.email, passwordHash, role: u.role, status: UserStatus.ACTIVE },
        { upsert: true, new: true },
      );
    } else {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        await User.create({ username: u.username, email: u.email, passwordHash, role: u.role, status: UserStatus.ACTIVE });
      }
    }
  }
  console.log(`  ✓ ${DEMO_USERS.length} users (admin + manager)`);

  const studentPasswordHash = await bcrypt.hash('student123', 12);
  
  const userOps = [];
  const studentOps = [];
  
  for (const s of SEED_STUDENTS) {
    const email = `${s.studentCode.toLowerCase()}@student.ptithcm.edu.vn`;
    // Generate a fixed or new ObjectId for the link (if upserting, we need to be careful, but using username is safe)
    userOps.push({
      updateOne: {
        filter: { username: s.studentCode },
        update: { $set: { email, passwordHash: studentPasswordHash, role: Role.STUDENT, status: UserStatus.ACTIVE } },
        upsert: true
      }
    });
  }
  
  // Bulk write users
  process.stdout.write(`\r  ... preparing users...`);
  await User.bulkWrite(userOps);
  
  // Now we need to fetch the users to get their _ids for the students
  const insertedUsers = await User.find({ role: Role.STUDENT }, { _id: 1, username: 1 });
  const userMap = new Map();
  insertedUsers.forEach(u => userMap.set(u.username, u._id));
  
  for (const s of SEED_STUDENTS) {
    const email = `${s.studentCode.toLowerCase()}@student.ptithcm.edu.vn`;
    const userId = userMap.get(s.studentCode);
    studentOps.push({
      updateOne: {
        filter: { studentCode: s.studentCode },
        update: { $set: {
          userId, studentCode: s.studentCode, fullName: s.fullName, email,
          gender: s.gender, department: s.department, academicYear: s.academicYear,
          className: s.className, major: s.major, residenceType: ResidenceType.NOT_RESIDING, isFreshman: s.isFreshman,
        } },
        upsert: true
      }
    });
  }
  
  process.stdout.write(`\r  ... preparing students...`);
  await Student.bulkWrite(studentOps);
  
  console.log(`\r  ✓ ${SEED_STUDENTS.length} students seeded successfully`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedUsersAndStudents();
  await mongoose.disconnect();
  console.log('Done');
}

if (process.argv[1]?.includes('seedUsers')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
