import { Router } from 'express';
import addressesRouter from './addresses.routes';
import adminRouter from './admin.routes';
import authRouter from './auth.routes';
import cartRouter from './cart.routes';
import catalogRouter from './catalog.routes';
import checkoutRouter from './checkout.routes';
import healthRouter from './health.routes';
import ordersRouter from './orders.routes';

const apiV1 = Router();

apiV1.use('/health', healthRouter);
apiV1.use('/auth', authRouter);
apiV1.use('/addresses', addressesRouter);
apiV1.use('/cart', cartRouter);
apiV1.use('/checkout', checkoutRouter);
apiV1.use('/orders', ordersRouter);
apiV1.use('/', catalogRouter);
apiV1.use('/admin', adminRouter);

export default apiV1;
