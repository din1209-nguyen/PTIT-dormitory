export interface RoomAssignment {
  _id: string;
  studentId: {
    _id: string;
    studentCode: string;
    fullName: string;
    gender: string;
    email?: string;
    phone?: string;
    address?: string;
    className?: string;
    major?: string;
    department?: string;
    academicYear?: string;
    isFreshman?: boolean;
    residenceType?: string;
  } | string;
  semesterId: { _id: string; name: string; term: string; academicYear: string } | string;
  roomId: { _id: string; roomNumber: string; genderType: string; capacity: number; isFreshmanPriority?: boolean } | string;
  bedId: { _id: string; bedNumber: string } | string;
  assignedAt: string;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  studentSnapshot?: Record<string, unknown>;
  roomSnapshot?: Record<string, unknown>;
}
