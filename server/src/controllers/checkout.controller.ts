import type { NextFunction, Request, Response } from 'express';
import { checkout } from '../services/orders.service';
import { AppError } from '../utils/AppError';

// Only an address reference is accepted from the client (see CheckoutSchema);
// prices, quantities, and totals always come from server-side state.
export async function checkoutCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user === undefined) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    const body: { addressId?: string } | undefined = req.body;
    res.status(201).json({ order: await checkout(req.user.id, body?.addressId) });
  } catch (err) {
    next(err);
  }
}
