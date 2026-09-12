import type { NextFunction, Request, Response } from 'express';
import type { AdminOrderQuery, OrderQuery } from '../schemas/order.schema';
import {
  adminGetOrder,
  adminListOrders,
  adminUpdateOrderStatus,
  getMyOrder,
  listMyOrders,
} from '../services/orders.service';
import { auditActor, recordAudit } from '../services/audit.service';
import { AppError } from '../utils/AppError';

function orderQuery(req: Request): OrderQuery {
  return req.validatedQuery as OrderQuery;
}

function adminOrderQuery(req: Request): AdminOrderQuery {
  return req.validatedQuery as AdminOrderQuery;
}

function userId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return req.user.id;
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await listMyOrders(userId(req), orderQuery(req)));
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ order: await getMyOrder(userId(req), req.params.id as string) });
  } catch (err) {
    next(err);
  }
}

export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await adminListOrders(adminOrderQuery(req)));
  } catch (err) {
    next(err);
  }
}

export async function adminGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ order: await adminGetOrder(req.params.id as string) });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.body is validated by validateBody(UpdateOrderStatusSchema).
    const order = await adminUpdateOrderStatus(req.params.id as string, req.body.status);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.order.status',
      entityType: 'order',
      entityId: order.id,
      metadata: { to: order.status },
      ipAddress: req.ip,
    });
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}
