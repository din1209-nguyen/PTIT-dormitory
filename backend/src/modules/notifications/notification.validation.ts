import { z } from 'zod';

export const createGeneralSchema = z.object({
  title: z.string().min(1).trim(),
  content: z.string().min(1),
  type: z.enum(['GENERAL', 'BILL', 'VIOLATION', 'REQUEST', 'REMINDER', 'RESIDENCE', 'SYSTEM', 'APPROVAL_STATUS']).optional().default('GENERAL'),
});

export const createPrivateSchema = z.object({
  title: z.string().min(1).trim(),
  content: z.string().min(1),
  type: z.enum(['GENERAL', 'BILL', 'VIOLATION', 'REQUEST', 'REMINDER', 'RESIDENCE', 'SYSTEM', 'APPROVAL_STATUS']).optional().default('GENERAL'),
  studentIds: z.array(z.string()).min(1),
});
