import { z } from 'zod';

// `.strictObject()` is a mass-assignment guard: a `role` (or any other
// privileged field) smuggled into the body fails validation instead of
// being silently ignored or, worse, persisted.
const emailField = z.email().max(255);
export const RegisterSchema = z.strictObject({
  email: emailField.transform((value) => value.toLowerCase()),
  // bcrypt truncates input at 72 bytes, so longer passwords are rejected
  // outright rather than silently weakened.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.strictObject({
  email: emailField.transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(72),
});

export type LoginDto = z.infer<typeof LoginSchema>;
