import { z } from 'zod';

export const createStudentSchema = z.object({
  studentCode: z.string().min(1).trim().regex(/^[a-zA-Z]{1,2}(\d{2})[a-zA-Z]{4}\d{3,4}$/, 'Mã số sinh viên không đúng định dạng (VD: N24DCCN010)'),
  fullName: z.string().min(1).trim(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  email: z.string().email().trim().toLowerCase(),
  phone: z.string().optional(),
  address: z.string().optional(),
  className: z.string().trim().optional().refine(val => !val || /^[a-zA-Z]{1,2}\d{2}[a-zA-Z]{4}\d{2}-[a-zA-Z0-9]{1,2}$/.test(val), 'Mã lớp không đúng định dạng (VD: D24CQCN01-N)'),
  major: z.string().optional(),
  department: z.string().optional(),
  academicYear: z.string().optional(),
  isFreshman: z.boolean().optional().default(false),
});

export const updateStudentSchema = createStudentSchema.partial();
