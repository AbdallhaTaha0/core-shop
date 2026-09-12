import { defineConfig } from 'vitest/config';
import 'dotenv/config'; // loads server/.env so TEST_DATABASE_URL works without shell exports

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Test files share one isolated database and truncate tables per test,
    // so files must run sequentially to avoid cross-file interference.
    fileParallelism: false,
    // Isolated test database. Override with TEST_DATABASE_URL when the
    // database does not listen on the standard 5432 (e.g. DB_HOST_PORT=5433
    // because a machine-local PostgreSQL already occupies 5432).
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgres://coreshop:coreshop-dev-only@127.0.0.1:5432/coreshop_test',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      JWT_SECRET: 'test-only-secret',
      JWT_EXPIRES_IN: '15m',
    },
    globalSetup: './tests/global-setup.ts',
  },
});
