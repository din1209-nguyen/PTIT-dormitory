import type { Student } from './student';

export type StudentSummary = Pick<Student, '_id' | 'studentCode' | 'fullName'> & Partial<Student>;

export interface Notification {
  _id: string;
  title: string;
  content: string;
  scope: 'GENERAL' | 'PRIVATE';
  type: string;
  createdAt: string;
  isRead?: boolean;
  students?: StudentSummary[];
}
