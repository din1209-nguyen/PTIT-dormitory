import { z } from 'zod';

export const createRequestSchema = z.object({
  type: z.enum(['REQUEST', 'COMPLAINT', 'FEEDBACK', 'CASH_PAYMENT', 'OTHER']),
  title: z.string().min(1).trim(),
  content: z.string().min(1),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'RESOLVED', 'REJECTED']),
  managerNote: z.string().optional(),
});
