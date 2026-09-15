import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';

const BASE = {
  DATABASE_URL: 'postgres://coreshop:coreshop-dev-only@localhost:5432/coreshop',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'unit-test-secret',
};

describe('loadEnv', () => {
  it('applies safe defaults for optional fields', () => {
    const env = loadEnv({ ...BASE });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('15m');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => loadEnv({ FRONTEND_ORIGIN: BASE.FRONTEND_ORIGIN })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects an invalid FRONTEND_ORIGIN', () => {
    expect(() => loadEnv({ ...BASE, FRONTEND_ORIGIN: 'not-a-url' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('strips trailing slashes from FRONTEND_ORIGIN so pasted dashboard URLs match Origin headers', () => {
    const env = loadEnv({ ...BASE, FRONTEND_ORIGIN: 'https://coreshop-v3ltbhkf.b4a.run/' });

    expect(env.FRONTEND_ORIGIN).toBe('https://coreshop-v3ltbhkf.b4a.run');
  });

  it('requires JWT_SECRET in every environment', () => {
    const withoutSecret: NodeJS.ProcessEnv = { ...BASE };
    delete withoutSecret.JWT_SECRET;
    expect(() => loadEnv(withoutSecret)).toThrow(/JWT_SECRET/);
  });

  it('accepts a complete production configuration', () => {
    const env = loadEnv({ ...BASE, NODE_ENV: 'production' });

    expect(env.NODE_ENV).toBe('production');
  });
});
