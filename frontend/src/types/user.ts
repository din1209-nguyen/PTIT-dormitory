export interface StudentInfo {
  _id: string;
  studentCode: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  email: string;
  phone?: string;
  address?: string;
  className?: string;
  major?: string;
  department?: string;
  academicYear?: string;
  residenceType?: string;
}

export interface User {
  _id: string;
  username: string;
  email?: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  studentInfo?: StudentInfo;
}
