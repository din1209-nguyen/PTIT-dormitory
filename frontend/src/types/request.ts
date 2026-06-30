import type { StudentSummary } from './notification';

export interface StudentRequestType {
  _id: string;
  studentId: StudentSummary | string;
  type: 'REQUEST' | 'COMPLAINT' | 'FEEDBACK' | 'CASH_PAYMENT' | 'OTHER';
  title: string;
  content: string;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
  managerNote?: string;
  processedAt?: string;
  createdAt: string;
}
