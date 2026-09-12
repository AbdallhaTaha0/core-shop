import { Router } from 'express';
import { getOrder, listOrders } from '../controllers/orders.controller';
import { authenticate } from '../middleware/authenticate';
import { validateParams, validateQuery } from '../middleware/validate';
import { OrderIdParamsSchema, OrderQuerySchema } from '../schemas/order.schema';

// Users only ever see their own orders (service scopes by session user id).
const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.get('/', validateQuery(OrderQuerySchema), listOrders);
ordersRouter.get('/:id', validateParams(OrderIdParamsSchema), getOrder);

export default ordersRouter;
