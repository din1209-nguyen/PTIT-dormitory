import { Student } from '../../models/student.model.js';
import { User } from '../../models/user.model.js';
import { ResidenceType } from '../constants/enums.js';
import { Role } from '../constants/roles.js';

export async function findOrCreateStudent(userId: string) {
  const existing = await Student.findOne({ userId });
  if (existing) return existing;

  const user = await User.findById(userId);
  if (!user || user.role !== Role.STUDENT) return null;

  return Student.create({
    userId: user._id,
    studentCode: user.username,
    fullName: user.username,
    email: user.email,
    gender: 'MALE',
    department: '',
    academicYear: '',
    className: '',
    residenceType: ResidenceType.NOT_RESIDING,
    isFreshman: false,
  });
}
