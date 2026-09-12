import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The app reads configuration lazily via getEnv(), so test defaults must be
// set before createApp() is first called in this file.
process.env.DATABASE_URL ??= 'postgres://coreshop:coreshop-dev-only@localhost:5432/coreshop';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';

vi.mock('../src/db/sequelize', async (importOriginal) => {
  // Keep the real module (so model registration keeps working through the
  // app's router tree) and stub only the connectivity probe.
  const actual = await importOriginal<typeof import('../src/db/sequelize')>();
  return { ...actual, checkDatabaseConnection: vi.fn() };
});

import { createApp } from '../src/app';
import { checkDatabaseConnection } from '../src/db/sequelize';

const mockCheck = vi.mocked(checkDatabaseConnection);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN as string;

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 200 with the connected shape when the database is reachable', async () => {
    mockCheck.mockResolvedValue('connected');

    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'core-shop-api',
      database: 'connected',
    });
  });

  it('returns 503 with the degraded shape when the database is unreachable', async () => {
    mockCheck.mockResolvedValue('disconnected');

    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'degraded',
      service: 'core-shop-api',
      database: 'disconnected',
    });
  });

  it('reflects the configured origin for CORS instead of a wildcard', async () => {
    mockCheck.mockResolvedValue('connected');

    const res = await request(createApp()).get('/api/v1/health').set('Origin', FRONTEND_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
  });
});

describe('error handling', () => {
  it('returns the stable NOT_FOUND shape for unknown routes', async () => {
    const res = await request(createApp()).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('returns INVALID_JSON for malformed request bodies', async () => {
    const res = await request(createApp())
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
