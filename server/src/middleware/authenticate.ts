import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE_NAME } from '../utils/cookies';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

// Optional variant for endpoints that serve both guests and users (cart).
// A valid session attaches the user; missing/invalid/expired tokens simply
// continue as guest instead of failing.
export function authenticateOptional(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== 'string' || token === '') {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Remain a guest; checkout (later phase) still requires a real session.
  }
  next();
}
// Authentication ("who is this user?") from the HttpOnly session cookie.
// Missing/invalid/expired tokens all fail closed with 401.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== 'string' || token === '') {
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}
