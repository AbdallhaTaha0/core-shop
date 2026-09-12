import type { NextFunction, Request, Response } from 'express';
import { getUserById, loginUser, registerUser } from '../services/auth.service';
import { auditActor, recordAudit } from '../services/audit.service';
import { mergeGuestCart, type MergeSummary } from '../services/cart.service';
import { AppError } from '../utils/AppError';
import {
  CART_COOKIE_NAME,
  clearAuthCookie,
  clearCartCookie,
  setAuthCookie,
} from '../utils/cookies';
import { signAccessToken } from '../utils/jwt';

// Moves a pre-login guest cart into the user's cart (deterministic merge,
// capped at stock). Runs on both register and login so checkout just works
// after authentication. Returns null when there was no guest cart.
async function mergeGuestCartOnLogin(
  req: Request,
  res: Response,
  userId: string,
): Promise<MergeSummary | null> {
  const guestCartId: unknown = req.cookies?.[CART_COOKIE_NAME];
  if (typeof guestCartId !== 'string' || guestCartId === '') {
    return null;
  }
  const summary = await mergeGuestCart(guestCartId, userId);
  if (summary !== null) {
    clearCartCookie(res);
  }
  return summary;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.body is already validated + typed by validateBody(RegisterSchema).
    const user = await registerUser(req.body);
    setAuthCookie(res, signAccessToken(user));
    await recordAudit({
      actorUserId: user.id,
      action: 'auth.register',
      metadata: { email: user.email },
      ipAddress: req.ip,
    });
    const guestCartMerge = await mergeGuestCartOnLogin(req, res, user.id);
    res.status(201).json({ user, guestCartMerge });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await loginUser(req.body);
    setAuthCookie(res, signAccessToken(user));
    await recordAudit({
      actorUserId: user.id,
      action: 'auth.login',
      metadata: { email: user.email },
      ipAddress: req.ip,
    });
    const guestCartMerge = await mergeGuestCartOnLogin(req, res, user.id);
    res.status(200).json({ user, guestCartMerge });
  } catch (err) {
    // Failed logins are audited without secrets: email only, never passwords.
    if (err instanceof AppError && err.code === 'INVALID_CREDENTIALS') {
      const body: unknown = req.body;
      const email =
        typeof body === 'object' &&
        body !== null &&
        'email' in body &&
        typeof body.email === 'string'
          ? body.email
          : undefined;
      await recordAudit({
        action: 'auth.login_failed',
        metadata: email !== undefined ? { email } : undefined,
        ipAddress: req.ip,
      });
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Deliberately not behind `authenticate`: clearing a stale/expired cookie
  // must succeed even when the session itself is already invalid.
  clearAuthCookie(res);
  await recordAudit({ actorUserId: auditActor(req), action: 'auth.logout', ipAddress: req.ip });
  res.status(200).json({ message: 'Logged out' });
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user === undefined) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    // Fresh lookup so deleted accounts lose access immediately.
    const user = await getUserById(req.user.id);
    if (user === null) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
