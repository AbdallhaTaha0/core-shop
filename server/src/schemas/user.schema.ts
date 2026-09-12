import { z } from 'zod';

export const UserQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
});

export type UserQuery = z.infer<typeof UserQuerySchema>;

export const UserIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});

// The only mutable field through this endpoint is the role itself —
// strictness plus a single-key object makes privilege changes explicit
// and immune to mass assignment.
export const UpdateUserRoleSchema = z.strictObject({
  role: z.enum(['customer', 'admin']),
});

export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleSchema>;
