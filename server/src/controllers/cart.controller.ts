import type { NextFunction, Request, Response } from 'express';
import {
  addItemToCart,
  emptyCartJson,
  getCartJson,
  removeCartItem,
  updateCartItem,
} from '../services/cart.service';
import { AppError } from '../utils/AppError';
import type { Cart } from '../models/cart';

function requireCart(req: Request): Cart {
  if (req.cart === null || req.cart === undefined) {
    // Unreachable through the router (ensureCart runs first); fail loudly.
    throw new AppError(500, 'CART_ERROR', 'Cart could not be resolved');
  }
  return req.cart;
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.cart === null || req.cart === undefined) {
      res.status(200).json({ cart: emptyCartJson() });
      return;
    }
    res.status(200).json({ cart: await getCartJson(req.cart.id) });
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.body is validated by validateBody(AddCartItemSchema).
    res.status(200).json({ cart: await addItemToCart(requireCart(req), req.body) });
  } catch (err) {
    next(err);
  }
}

export async function updateCartItemQuantity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res
      .status(200)
      .json({ cart: await updateCartItem(requireCart(req), req.params.id as string, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function removeCartItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({ cart: await removeCartItem(requireCart(req), req.params.id as string) });
  } catch (err) {
    next(err);
  }
}
