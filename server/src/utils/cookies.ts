import type { CookieOptions, Response } from 'express';
import { getEnv } from '../config/env';
import { parseExpiresInToMs } from './jwt';

export const AUTH_COOKIE_NAME = 'access_token';

// Cookie authentication posture:
// - HttpOnly always (no JS access to the token).
// - Secure in production (localhost counts as trustworthy for local dev).
// - SameSite=Lax: cross-site POSTs never carry the cookie in modern browsers.
//   Lax (not Strict) preserves top-level navigation usability for the future
//   frontend. This is one layer — state-changing auth routes additionally
//   require an Origin check (see requireOrigin middleware).
export function authCookieOptions(): CookieOptions {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseExpiresInToMs(env.JWT_EXPIRES_IN),
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  // Same scope attributes as when the cookie was set (minus max-age), so
  // browsers actually match and remove it.
  const options = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

// Guest carts are keyed by an unguessable UUID cookie (no auth involved).
// Same hardening as session cookies; state-changing cart routes additionally
// require an Origin check (see requireOrigin middleware).
export const CART_COOKIE_NAME = 'cart_id';

const CART_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function cartCookieOptions(): CookieOptions {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_MS,
  };
}

export function setCartCookie(res: Response, cartId: string): void {
  res.cookie(CART_COOKIE_NAME, cartId, cartCookieOptions());
}

export function clearCartCookie(res: Response): void {
  const options = cartCookieOptions();
  res.clearCookie(CART_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}
