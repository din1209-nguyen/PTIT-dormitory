import { z } from 'zod';

export const createSemesterSchema = z.object({
  name: z.string().min(1).trim(),
  term: z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER']),
  academicYear: z.string().min(1).trim(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const updateSemesterSchema = createSemesterSchema.partial();
