import { Router } from 'express';
import { checkoutCart } from '../controllers/checkout.controller';
import { authenticate } from '../middleware/authenticate';
import { requireOrigin } from '../middleware/requireOrigin';
import { validateBody } from '../middleware/validate';
import { CheckoutSchema } from '../schemas/checkout.schema';

// Single checkout entry point (not POST /orders): the order is derived from
// the authenticated user's cart; the body carries at most an address id.
const checkoutRouter = Router();

checkoutRouter.post('/', authenticate, requireOrigin, validateBody(CheckoutSchema), checkoutCart);

export default checkoutRouter;
