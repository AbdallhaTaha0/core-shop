import type { NextFunction, Request, Response } from 'express';
import type { UserQuery } from '../schemas/user.schema';
import { getUser, listUsers, updateUserRole } from '../services/users.service';
import { auditActor, recordAudit } from '../services/audit.service';
import { AppError } from '../utils/AppError';

function userQuery(req: Request): UserQuery {
  return req.validatedQuery as UserQuery;
}

function callerId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return req.user.id;
}

export async function adminListUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json(await listUsers(userQuery(req)));
  } catch (err) {
    next(err);
  }
}

export async function adminGetUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ user: await getUser(req.params.id as string) });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateUserRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.body is validated by validateBody(UpdateUserRoleSchema).
    const user = await updateUserRole(callerId(req), req.params.id as string, req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.user.role',
      entityType: 'user',
      entityId: user.id,
      metadata: { role: user.role },
      ipAddress: req.ip,
    });
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
