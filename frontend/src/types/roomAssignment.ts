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
  semesterId: {
    _id: string;
    name: string;
    term: string;
    academicYear: string;
    status: string;
    startDate: string;
    endDate: string;
  } | string;
  roomId: {
    _id: string;
    roomNumber: string;
    genderType: string;
    capacity: number;
    isFreshmanPriority?: boolean;
    floorId?: {
      _id: string;
      floorNumber?: number;
      buildingId?: { _id: string; name?: string } | string;
    } | string;
  } | string;
  bedId: { _id: string; bedNumber: string } | string;
  assignedAt: string;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  studentSnapshot?: Record<string, unknown>;
  roomSnapshot?: { buildingName?: string; floorNumber?: number; roomNumber?: string; bedNumber?: string; [key: string]: unknown };
}
