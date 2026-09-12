import { z } from 'zod';

export const CreateBrandSchema = z.strictObject({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .max(140)
    .optional(),
});

export type CreateBrandDto = z.infer<typeof CreateBrandSchema>;

export const UpdateBrandSchema = CreateBrandSchema.partial();

export type UpdateBrandDto = z.infer<typeof UpdateBrandSchema>;

export const BrandIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});
