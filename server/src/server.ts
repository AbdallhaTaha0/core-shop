import 'dotenv/config';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { getSequelize } from './db/sequelize';

// Fail fast on invalid configuration before binding any port.
const env = loadEnv();

async function main(): Promise<void> {
  try {
    await getSequelize().authenticate();
    console.log('Database connection established');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    if (env.NODE_ENV === 'production') {
      console.error(`Database connection failed, refusing to start: ${message}`);
      process.exit(1);
    }
    // Development/test convenience: stay up so the API surface (and the
    // degraded health shape) remains observable; /health reports 503.
    console.warn(`Database unavailable, starting in degraded mode: ${message}`);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`core-shop-api listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}, shutting down`);
    server.close(() => {
      void getSequelize()
        .close()
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void main();
