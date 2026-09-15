import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
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
  // Helmet defaults, except images: admins paste external photo URLs and the
  // storefront renders them in <img> tags, so `https:` sources must be
  // allowed. Everything else (notably `script-src 'self'`, no inline
  // scripts) stays at the strict default — the built frontend ships no
  // inline scripts.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
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

  // Single-container deployments: serve the built frontend (Vite `dist/`)
  // alongside the API so one host serves both same-origin. Only active when
  // CLIENT_DIST_DIR is set; otherwise the API stays API-only. Placement is
  // deliberate: API routes and /api-docs run first, so unknown /api/* paths
  // still fall through to the JSON 404 handler untouched.
  if (env.CLIENT_DIST_DIR !== undefined) {
    const clientDir = path.resolve(env.CLIENT_DIST_DIR);
    const indexHtml = path.join(clientDir, 'index.html');
    if (!existsSync(indexHtml)) {
      throw new Error(
        `Invalid environment configuration (CLIENT_DIST_DIR has no index.html: ${clientDir})`,
      );
    }
    app.use(express.static(clientDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (
        req.path === '/api' ||
        req.path.startsWith('/api/') ||
        req.path === '/api-docs' ||
        req.path.startsWith('/api-docs/')
      ) {
        next();
        return;
      }
      res.sendFile(indexHtml, (err) => {
        if (err) {
          next(err);
        }
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
