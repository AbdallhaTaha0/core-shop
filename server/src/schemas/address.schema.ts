import { z } from 'zod';

const countryField = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'Country must be a 2-letter code')
  .transform((value) => value.toUpperCase());

export const CreateAddressSchema = z.strictObject({
  label: z.string().min(1).max(30).optional(),
  fullName: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  country: countryField,
  isDefault: z.boolean().default(false),
});

export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;

export const UpdateAddressSchema = CreateAddressSchema.partial();

export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;

export const AddressIdParamsSchema = z.strictObject({
  id: z.string().uuid(),
});
