import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { getEnv } from './config/env';
import { openapiDocument } from './docs/openapi';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import apiV1 from './routes/index';

// CSRF posture: session and cart identity live in HttpOnly cookies with
// SameSite=Lax (Secure in production). Every state-changing cookie route
// additionally requires an Origin check (see requireOrigin middleware),
// so cross-site request forgery fails at two independent layers.
// CORS never uses a wildcard with credentials.
export function createApp(): express.Express {
  const env = getEnv();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  // Payload limits: abuse-prone oversized bodies are rejected early.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );

  app.use('/api/v1', apiV1);

  // API documentation: machine-readable spec plus interactive UI. Public by
  // design (no secrets in the spec); the UI runs fully client-side.
  app.get('/api-docs.json', (_req, res) => {
    res.json(openapiDocument);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
