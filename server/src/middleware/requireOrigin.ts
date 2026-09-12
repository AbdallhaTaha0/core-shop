import type { NextFunction, Request, Response } from 'express';
import { getEnv } from '../config/env';
import { AppError } from '../utils/AppError';

// CSRF second layer (the first is SameSite=Lax session cookies): browsers
// always send Origin on fetch POSTs, so state-changing cookie-authenticated
// routes require it to exactly match the configured frontend origin.
// A same-origin form post without Origin falls back to Referer.
export function requireOrigin(req: Request, _res: Response, next: NextFunction): void {
  const env = getEnv();
  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (origin !== env.FRONTEND_ORIGIN) {
      next(new AppError(403, 'CSRF_BLOCKED', 'Cross-origin request blocked'));
      return;
    }
    next();
    return;
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      next(new AppError(403, 'CSRF_BLOCKED', 'Cross-origin request blocked'));
      return;
    }
    if (refererOrigin !== env.FRONTEND_ORIGIN) {
      next(new AppError(403, 'CSRF_BLOCKED', 'Cross-origin request blocked'));
      return;
    }
    next();
    return;
  }
  next(new AppError(403, 'CSRF_BLOCKED', 'Cross-origin request blocked'));
}
