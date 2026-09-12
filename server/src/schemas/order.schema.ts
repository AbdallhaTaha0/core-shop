import { z } from 'zod';
import { ORDER_STATUSES } from '../models/order';

export const OrderQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type OrderQuery = z.infer<typeof OrderQuerySchema>;

export const AdminOrderQuerySchema = OrderQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export type AdminOrderQuery = z.infer<typeof AdminOrderQuerySchema>;

export const OrderIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});

export const UpdateOrderStatusSchema = z.strictObject({
  status: z.enum(ORDER_STATUSES),
});

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
