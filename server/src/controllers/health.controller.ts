import type { NextFunction, Request, Response } from 'express';
import { getHealth } from '../services/health.service';

export async function getHealthStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getHealth();
    res.status(result.httpStatus).json(result.body);
  } catch (err) {
    next(err);
  }
}
