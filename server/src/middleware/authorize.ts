import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/user';
import { AppError } from '../utils/AppError';

// Authorization ("is this user allowed?") is always derived from the
// server-verified session — never from client-supplied role fields.
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user === undefined) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
