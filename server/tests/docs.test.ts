import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openapiDocument } from '../src/docs/openapi';

const app = createApp();

// Guards the hand-maintained spec against drift: every key route must be
// documented, and the document must stay structurally valid.
const REQUIRED_PATHS = [
  '/api/v1/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/addresses',
  '/api/v1/addresses/{id}',
  '/api/v1/cart',
  '/api/v1/cart/items',
  '/api/v1/cart/items/{id}',
  '/api/v1/checkout',
  '/api/v1/orders',
  '/api/v1/orders/{id}',
  '/api/v1/products',
  '/api/v1/products/{slug}',
  '/api/v1/categories',
  '/api/v1/brands',
  '/api/v1/admin/products',
  '/api/v1/admin/products/{id}',
  '/api/v1/admin/categories',
  '/api/v1/admin/categories/{id}',
  '/api/v1/admin/brands',
  '/api/v1/admin/brands/{id}',
  '/api/v1/admin/orders',
  '/api/v1/admin/orders/{id}',
  '/api/v1/admin/users',
  '/api/v1/admin/users/{id}',
  '/api/v1/admin/audit-logs',
];

describe('API documentation', () => {
  it('serves a valid OpenAPI document covering every route', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.0\./);

    const paths = Object.keys(res.body.paths as Record<string, unknown>);
    for (const required of REQUIRED_PATHS) {
      expect(paths).toContain(required);
    }

    // Every operation declares at least one response.
    for (const [path, item] of Object.entries(
      res.body.paths as Record<string, Record<string, { responses?: unknown }>>,
    )) {
      for (const [method, operation] of Object.entries(item)) {
        expect(
          operation.responses,
          `${method.toUpperCase()} ${path} must document responses`,
        ).toBeDefined();
      }
    }
  });

  it('serves the interactive UI', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('keeps the in-code document importable and versioned', () => {
    expect(openapiDocument.info.title).toBe('Core Shop API');
    expect(openapiDocument.components.securitySchemes).toHaveProperty('cookieAuth');
  });
});
