import { z } from 'zod';

export const AddCartItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(999).default(1),
});

export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;

export const UpdateCartItemSchema = z.strictObject({
  quantity: z.number().int().min(1).max(999),
});

export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;

export const CartItemIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});
