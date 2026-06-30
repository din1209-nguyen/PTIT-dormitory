import { z } from 'zod';

export const createBuildingSchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional().default('ACTIVE'),
});
export const updateBuildingSchema = createBuildingSchema.partial().extend({
  genderType: z.enum(['MALE', 'FEMALE']).optional(),
  isFreshmanPriority: z.boolean().optional(),
});

export const createFloorSchema = z.object({
  buildingId: z.string().min(1),
  floorNumber: z.coerce.number().int().min(1),
  description: z.string().optional(),
});
export const updateFloorSchema = z.object({
  floorNumber: z.coerce.number().int().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
  genderType: z.enum(['MALE', 'FEMALE']).optional(),
  isFreshmanPriority: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  floorId: z.string().min(1),
  roomNumber: z.string().min(1).trim(),
  capacity: z.coerce.number().int().min(1).default(8),
  genderType: z.enum(['MALE', 'FEMALE']),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional().default('ACTIVE'),
  isFreshmanPriority: z.boolean().optional().default(false),
});
export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).trim().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  genderType: z.enum(['MALE', 'FEMALE']).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
  isFreshmanPriority: z.boolean().optional(),
});

export const updateBedSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BROKEN']),
});

export const createBedSchema = z.object({
  roomId: z.string().min(1),
});
