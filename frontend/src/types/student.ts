export interface Student {
  _id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string;
  gender: 'MALE' | 'FEMALE';
  email: string;
  phone?: string;
  address?: string;
  className?: string;
  major?: string;
  department?: string;
  academicYear?: string;
  isFreshman: boolean;
  residenceType: 'NOT_RESIDING' | 'PENDING_ROOM' | 'RESIDING';
  createdAt: string;
  updatedAt: string;
}
