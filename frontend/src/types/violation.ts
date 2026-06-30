import type { StudentSummary } from './notification';

export interface Violation {
  _id: string;
  studentId: StudentSummary | string;
  semesterId?: { _id: string; name: string } | string;
  description: string;
  penalty?: string;
  violationDate: string;
  status: 'RECORDED' | 'PROCESSING' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
}
