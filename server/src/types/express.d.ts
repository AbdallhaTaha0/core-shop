import type { Cart } from '../models/cart';
import type { UserRole } from '../models/user';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      // Validated query payload (see validateQuery). Express 5 exposes
      // `req.query` through a getter, so parsed queries live here instead.
      validatedQuery?: unknown;
      // Caller cart resolved by resolveCart (null = no cart yet).
      cart?: Cart | null;
    }
  }
}

export {};
