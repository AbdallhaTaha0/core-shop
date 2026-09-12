import type { NextFunction, Request, Response } from 'express';
import type { AuditQuery } from '../schemas/audit.schema';
import { listAuditLogs } from '../services/audit.service';

export async function adminListAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.validatedQuery as AuditQuery;
    res.status(200).json(await listAuditLogs(query));
  } catch (err) {
    next(err);
  }
}
