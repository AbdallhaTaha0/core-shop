import { z } from 'zod';

// Checkout consumes no client-calculated data: the only accepted input is an
// optional address reference. Unknown fields (totals, prices, discounts) are
// rejected rather than silently ignored. The schema itself is optional so a
// bodyless POST also succeeds.
export const CheckoutSchema = z
  .strictObject({
    addressId: z.string().uuid().optional(),
  })
  .optional();

export type CheckoutDto = z.infer<typeof CheckoutSchema>;
