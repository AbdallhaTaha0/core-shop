import { z } from 'zod';

export const productSlugField = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
  .max(220);

const trueFalse = z.enum(['true', 'false']).transform((value) => value === 'true');

export const ProductQuerySchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
    q: z.string().max(100).optional(),
    category: z.string().max(140).optional(),
    brand: z.string().max(140).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    inStock: trueFalse.optional(),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'minPrice must not exceed maxPrice',
    },
  );

export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export const AdminProductQuerySchema = ProductQuerySchema.extend({
  includeInactive: trueFalse.optional(),
});

export type AdminProductQuery = z.infer<typeof AdminProductQuerySchema>;

export const ProductSlugParamsSchema = z.strictObject({
  slug: productSlugField,
});

export const ProductIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});

export const ProductImageInputSchema = z.strictObject({
  url: z.url().max(2048),
  altText: z.string().max(255).optional(),
});

export const CreateProductSchema = z.strictObject({
  name: z.string().min(1).max(200),
  slug: productSlugField.optional(),
  description: z.string().max(5000).optional(),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid(),
  images: z.array(ProductImageInputSchema).max(10).default([]),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
