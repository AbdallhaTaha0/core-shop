import { z } from 'zod';

// Centralized environment validation. All `process.env` access must go
// through here — never scatter raw `process.env.X` across the app.
// The application fails fast at startup when configuration is invalid.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_ORIGIN: z.url('FRONTEND_ORIGIN must be a valid URL'),
  // Required in every environment now that the auth domain issues JWTs.
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  // Optional single-container deployments (e.g. Back4app from the repo root):
  // when set, the API also serves the built frontend from this directory with
  // an SPA fallback. Unset by default so local dev and tests are unaffected.
  CLIENT_DIST_DIR: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = z.flattenError(parsed.error);
    // Never log values — only field names — so secrets cannot leak into logs.
    const fields = Object.keys(details.fieldErrors);
    throw new Error(
      `Invalid environment configuration (invalid fields: ${fields.join(', ') || 'unknown'})`,
    );
  }
  const env = parsed.data;
  return env;
}

export function getEnv(): Env {
  cached ??= loadEnv();
  return cached;
}
