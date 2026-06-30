export interface Semester {
  _id: string;
  name: string;
  term: 'SEMESTER_1' | 'SEMESTER_2' | 'SUMMER';
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'UNOPENED' | 'PREPARING' | 'ACTIVE' | 'FINISHED';
  createdAt: string;
}
