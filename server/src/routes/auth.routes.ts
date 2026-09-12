import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimit';
import { requireOrigin } from '../middleware/requireOrigin';
import { validateBody } from '../middleware/validate';
import { LoginSchema, RegisterSchema } from '../schemas/auth.schema';

const authRouter = Router();

authRouter.post('/register', authLimiter, requireOrigin, validateBody(RegisterSchema), register);
authRouter.post('/login', authLimiter, requireOrigin, validateBody(LoginSchema), login);
authRouter.post('/logout', requireOrigin, logout);
authRouter.get('/me', authenticate, me);

export default authRouter;
