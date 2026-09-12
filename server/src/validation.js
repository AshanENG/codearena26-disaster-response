import { z } from 'zod';
export const reportInput = z.object({
  description: z.string().trim().min(10).max(2000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
export const listInput = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(50),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(100000)).default(0),
}).strict();
