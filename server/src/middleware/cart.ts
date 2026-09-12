import type { NextFunction, Request, Response } from 'express';
import { Cart } from '../models/index';
import { CART_COOKIE_NAME, setCartCookie } from '../utils/cookies';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolves the caller's cart without creating junk rows:
// - authenticated: the user's cart (exactly one per user; created on demand);
// - guest with a valid cart cookie: that cart, but only if it is anonymous.
//   A cookie pointing at another user's cart is ignored (never leak carts).
// - otherwise: null (GET returns an empty shape; mutations create a cart).
export async function resolveCart(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user !== undefined) {
      const [cart] = await Cart.findOrCreate({
        where: { userId: req.user.id },
        defaults: { userId: req.user.id },
      });
      req.cart = cart;
      next();
      return;
    }
    const cartId: unknown = req.cookies?.[CART_COOKIE_NAME];
    if (typeof cartId !== 'string' || !UUID_PATTERN.test(cartId)) {
      req.cart = null;
      next();
      return;
    }
    const cart = await Cart.findByPk(cartId);
    req.cart = cart !== null && cart.userId === null ? cart : null;
    next();
  } catch (err) {
    next(err);
  }
}

// Ensures mutations always have a persistent cart, creating a guest cart
// (and its cookie) when the caller has none.
export async function ensureCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.cart === null || req.cart === undefined) {
      req.cart = await Cart.create({ userId: req.user?.id ?? null });
      setCartCookie(res, req.cart.id);
    }
    next();
  } catch (err) {
    next(err);
  }
}
