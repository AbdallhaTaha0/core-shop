import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getEnv } from '../config/env';
import type { UserRole } from '../models/user';
import { AppError } from './AppError';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

const PayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['customer', 'admin']),
});

// Accepts jsonwebtoken-style durations ("30s", "15m", "2h", "7d").
// Shared by signing (converted to seconds) and cookie max-age (milliseconds).
export function parseExpiresInToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  const amountRaw = match?.[1];
  const unit = match?.[2];
  if (amountRaw === undefined || unit === undefined) {
    throw new Error(`Invalid JWT_EXPIRES_IN format: "${value}" (expected like "15m", "2h", "7d")`);
  }
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return Number(amountRaw) * multipliers[unit as keyof typeof multipliers];
}

export function signAccessToken(user: { id: string; role: UserRole }): string {
  const env = getEnv();
  const expiresInSeconds = Math.floor(parseExpiresInToMs(env.JWT_EXPIRES_IN) / 1000);
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = getEnv();
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Session has expired');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid session');
  }
  const parsed = PayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid session');
  }
  return parsed.data;
}
