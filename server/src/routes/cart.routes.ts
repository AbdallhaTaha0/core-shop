import { Router } from 'express';
import {
  addCartItem,
  getCart,
  removeCartItemById,
  updateCartItemQuantity,
} from '../controllers/cart.controller';
import { authenticateOptional } from '../middleware/authenticate';
import { ensureCart, resolveCart } from '../middleware/cart';
import { requireOrigin } from '../middleware/requireOrigin';
import { validateBody, validateParams } from '../middleware/validate';
import {
  AddCartItemSchema,
  CartItemIdParamsSchema,
  UpdateCartItemSchema,
} from '../schemas/cart.schema';

// Serves guests (cart cookie) and users (session) alike. Reads are public;
// every mutation requires an Origin check because both identity mechanisms
// are cookie-based (see requireOrigin).
const cartRouter = Router();

cartRouter.get('/', authenticateOptional, resolveCart, getCart);
cartRouter.post(
  '/items',
  authenticateOptional,
  resolveCart,
  requireOrigin,
  ensureCart,
  validateBody(AddCartItemSchema),
  addCartItem,
);
cartRouter.patch(
  '/items/:id',
  authenticateOptional,
  resolveCart,
  requireOrigin,
  ensureCart,
  validateParams(CartItemIdParamsSchema),
  validateBody(UpdateCartItemSchema),
  updateCartItemQuantity,
);
cartRouter.delete(
  '/items/:id',
  authenticateOptional,
  resolveCart,
  requireOrigin,
  ensureCart,
  validateParams(CartItemIdParamsSchema),
  removeCartItemById,
);

export default cartRouter;
