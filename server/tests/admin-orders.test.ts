import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { Product } from '../src/models/product';
import { registerUser } from '../src/services/auth.service';
import { paymentProvider } from '../src/services/payment.service';
import { ORIGIN, createAdminUser, loginAgent, seedProduct } from './helpers/catalog';
import { truncateAll } from './helpers/db';
import { addToCart, customerAgent } from './helpers/orders';

const app = createApp();

vi.mock('../src/services/payment.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/payment.service')>();
  return {
    ...actual,
    paymentProvider: {
      charge: vi.fn(),
      refund: vi.fn(),
    },
  };
});

const mockCharge = vi.mocked(paymentProvider.charge);

async function admin(): Promise<request.Agent> {
  await createAdminUser();
  return loginAgent(app, 'admin@example.com', 'admin-password-1');
}

describe('admin order management', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.resetAllMocks();
    mockCharge.mockImplementation(async ({ amountCents, currency }) => ({
      paymentId: `mock_test_${amountCents}`,
      amountCents,
      currency,
    }));
  });

  it('rejects unauthenticated and non-admin access', async () => {
    expect((await request(app).get('/api/v1/admin/orders')).status).toBe(401);

    await registerUser({ email: 'customer@example.com', password: 'customer-pass-1' });
    const customer = await loginAgent(app, 'customer@example.com', 'customer-pass-1');
    const patch = await customer
      .patch('/api/v1/admin/orders/123e4567-e89b-12d3-a456-426614174000')
      .set('Origin', ORIGIN)
      .send({ status: 'shipped' });
    expect(patch.status).toBe(403);
  });

  it('lists all orders with an optional status filter', async () => {
    const agent = await admin();
    const ada = await customerAgent(app, 'ada@example.com');
    const seeded = await seedProduct({ priceCents: 1000, stock: 10 });
    await addToCart(ada, seeded.id, 1);
    expect((await ada.post('/api/v1/checkout').set('Origin', ORIGIN)).status).toBe(201);

    const all = await agent.get('/api/v1/admin/orders');
    expect(all.body.meta.total).toBe(1);

    const paid = await agent.get('/api/v1/admin/orders?status=paid');
    expect(paid.body.meta.total).toBe(1);

    const shipped = await agent.get('/api/v1/admin/orders?status=shipped');
    expect(shipped.body.meta.total).toBe(0);

    const badStatus = await agent.get('/api/v1/admin/orders?status=lost');
    expect(badStatus.status).toBe(400);
  });

  it('advances orders along the state machine only', async () => {
    const agent = await admin();
    const ada = await customerAgent(app, 'ada@example.com');
    const seeded = await seedProduct({ priceCents: 1000, stock: 10 });
    await addToCart(ada, seeded.id, 1);
    const orderId = (await ada.post('/api/v1/checkout').set('Origin', ORIGIN)).body.order
      .id as string;

    const processing = await agent
      .patch(`/api/v1/admin/orders/${orderId}`)
      .set('Origin', ORIGIN)
      .send({ status: 'processing' });
    expect(processing.status).toBe(200);
    expect(processing.body.order.status).toBe('processing');

    const skip = await agent
      .patch(`/api/v1/admin/orders/${orderId}`)
      .set('Origin', ORIGIN)
      .send({ status: 'delivered' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const unknown = await agent
      .patch(`/api/v1/admin/orders/${orderId}`)
      .set('Origin', ORIGIN)
      .send({ status: 'teleported' });
    expect(unknown.status).toBe(400);

    const missing = await agent
      .patch('/api/v1/admin/orders/123e4567-e89b-12d3-a456-426614174000')
      .set('Origin', ORIGIN)
      .send({ status: 'processing' });
    expect(missing.status).toBe(404);
  });

  it('restocks inventory when an order is cancelled', async () => {
    const agent = await admin();
    const ada = await customerAgent(app, 'ada@example.com');
    const seeded = await seedProduct({ priceCents: 1000, stock: 5 });
    await addToCart(ada, seeded.id, 2);
    const orderId = (await ada.post('/api/v1/checkout').set('Origin', ORIGIN)).body.order
      .id as string;
    expect((await Product.findByPk(seeded.id))?.stock).toBe(3);

    const cancelled = await agent
      .patch(`/api/v1/admin/orders/${orderId}`)
      .set('Origin', ORIGIN)
      .send({ status: 'cancelled' });
    expect(cancelled.status).toBe(200);
    expect((await Product.findByPk(seeded.id))?.stock).toBe(5);

    // Terminal states admit no further transitions.
    const again = await agent
      .patch(`/api/v1/admin/orders/${orderId}`)
      .set('Origin', ORIGIN)
      .send({ status: 'paid' });
    expect(again.status).toBe(409);
  });
});
