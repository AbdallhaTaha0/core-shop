import { z } from 'zod';

export const AuditQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().max(60).optional(),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;
