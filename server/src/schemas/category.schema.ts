import { z } from 'zod';

export const slugField = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
  .max(220);

const optionalSlug = slugField.max(140);

export const CreateCategorySchema = z.strictObject({
  name: z.string().min(1).max(120),
  slug: optionalSlug.optional(),
  description: z.string().max(5000).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

export const CategoryIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});
