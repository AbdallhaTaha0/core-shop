import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { Order } from '../src/models/index';
import { Product } from '../src/models/product';
import { PaymentDeclinedError, paymentProvider } from '../src/services/payment.service';
import { ORIGIN, seedProduct } from './helpers/catalog';
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
const mockRefund = vi.mocked(paymentProvider.refund);

describe('POST /api/v1/checkout', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.resetAllMocks();
    mockCharge.mockImplementation(async ({ amountCents, currency }) => ({
      paymentId: `mock_test_${amountCents}`,
      amountCents,
      currency,
    }));
    mockRefund.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated checkout', async () => {
    const res = await request(app).post('/api/v1/checkout').set('Origin', ORIGIN);
    expect(res.status).toBe(401);
  });

  it('rejects empty carts', async () => {
    const agent = await customerAgent(app);
    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it('creates a paid order from server-side totals, snapshots prices, reduces stock, clears cart', async () => {
    const agent = await customerAgent(app);
    const first = await seedProduct({ name: 'Board A', priceCents: 10000, stock: 5 });
    const second = await seedProduct({ name: 'Board B', priceCents: 2500, stock: 5 });
    await addToCart(agent, first.id, 2);
    await addToCart(agent, second.id, 1);

    // Client-calculated totals are not an accepted input at all.
    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN).send({});

    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: 'paid',
      currency: 'USD',
      subtotalCents: 22500,
      totalCents: 22500,
    });
    expect(res.body.order.paymentId).toMatch(/^mock_test_/);
    expect(mockCharge).toHaveBeenCalledWith({ amountCents: 22500, currency: 'USD' });

    const prices = Object.fromEntries(
      res.body.order.items.map((item: { unitPriceCents: number; product: { slug: string } }) => [
        item.product.slug,
        item.unitPriceCents,
      ]),
    );
    expect(prices[first.slug]).toBe(10000);
    expect(prices[second.slug]).toBe(2500);

    expect((await Product.findByPk(first.id))?.stock).toBe(3);
    expect((await Product.findByPk(second.id))?.stock).toBe(4);
    expect((await agent.get('/api/v1/cart')).body.cart.items).toHaveLength(0);
  });

  it('rejects unknown checkout fields instead of ignoring them', async () => {
    const agent = await customerAgent(app);
    const res = await agent
      .post('/api/v1/checkout')
      .set('Origin', ORIGIN)
      .send({ total: 1, priceCents: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('preserves historical prices when the catalog price changes later', async () => {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ name: 'Pinned Board', priceCents: 10000, stock: 5 });
    await addToCart(agent, seeded.id, 1);
    const orderId = (await agent.post('/api/v1/checkout').set('Origin', ORIGIN)).body.order.id;

    await Product.update(
      { priceCents: 99999, name: 'Renamed Board' },
      { where: { id: seeded.id } },
    );

    const refetched = await agent.get(`/api/v1/orders/${orderId}`);
    expect(refetched.body.order.items[0]).toMatchObject({
      unitPriceCents: 10000,
      product: { slug: seeded.slug, name: 'Pinned Board' },
    });
  });

  it('rejects checkout without charging when stock runs out first', async () => {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ priceCents: 5000, stock: 2 });
    await addToCart(agent, seeded.id, 2);
    // Another buyer takes the last units before this checkout lands.
    await Product.update({ stock: 1 }, { where: { id: seeded.id } });

    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    // Fails before any money moves: nothing to charge, nothing to refund.
    expect(mockCharge).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
    expect(await Order.count()).toBe(0);
    expect((await Product.findByPk(seeded.id))?.stock).toBe(1);
    // The cart is untouched so the customer can adjust and retry.
    expect((await agent.get('/api/v1/cart')).body.cart.items).toHaveLength(1);
  });

  it('refunds the charge when fulfillment fails mid-transaction', async () => {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ priceCents: 5000, stock: 4 });
    await addToCart(agent, seeded.id, 1);
    const createSpy = vi.spyOn(Order, 'create').mockRejectedValueOnce(new Error('disk on fire'));

    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);

    expect(res.status).toBe(500);
    expect(mockCharge).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(await Order.count()).toBe(0);
    expect((await Product.findByPk(seeded.id))?.stock).toBe(4);
    expect((await agent.get('/api/v1/cart')).body.cart.items).toHaveLength(1);
    createSpy.mockRestore();
  });

  it('writes nothing when payment is declined', async () => {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ priceCents: 5000, stock: 4 });
    await addToCart(agent, seeded.id, 1);
    mockCharge.mockRejectedValueOnce(new PaymentDeclinedError());

    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_FAILED');
    expect(mockRefund).not.toHaveBeenCalled();
    expect(await Order.count()).toBe(0);
    expect((await Product.findByPk(seeded.id))?.stock).toBe(4);
    expect((await agent.get('/api/v1/cart')).body.cart.items).toHaveLength(1);
  });

  it('rejects checkout with unavailable items and origin-less posts', async () => {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ stock: 3 });
    await addToCart(agent, seeded.id, 1);
    await Product.update({ isActive: false }, { where: { id: seeded.id } });

    const unavailable = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);
    expect(unavailable.status).toBe(409);

    const noOrigin = await agent.post('/api/v1/checkout');
    expect(noOrigin.status).toBe(403);
    expect(noOrigin.body.error.code).toBe('CSRF_BLOCKED');
  });
});

describe('GET /api/v1/orders', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.resetAllMocks();
    mockCharge.mockImplementation(async ({ amountCents, currency }) => ({
      paymentId: `mock_test_${amountCents}`,
      amountCents,
      currency,
    }));
  });

  it('isolates order history per user with pagination', async () => {
    const ada = await customerAgent(app, 'ada@example.com');
    const bob = await customerAgent(app, 'bob@example.com');
    const seeded = await seedProduct({ priceCents: 1000, stock: 10 });

    await addToCart(ada, seeded.id, 1);
    await agentCheckout(ada);
    await addToCart(ada, seeded.id, 1);
    await agentCheckout(ada);
    await addToCart(bob, seeded.id, 1);
    await agentCheckout(bob);

    const adaOrders = await ada.get('/api/v1/orders');
    expect(adaOrders.body.meta).toMatchObject({ total: 2 });
    expect(adaOrders.body.data).toHaveLength(2);

    const bobOrders = await bob.get('/api/v1/orders?limit=1');
    expect(bobOrders.body.meta).toMatchObject({ total: 1, totalPages: 1 });

    // Bob's order is invisible to Ada.
    const bobOrderId = bobOrders.body.data[0].id as string;
    expect((await ada.get(`/api/v1/orders/${bobOrderId}`)).status).toBe(404);

    const malformed = await ada.get('/api/v1/orders/not-a-uuid');
    expect(malformed.status).toBe(400);

    expect((await request(app).get('/api/v1/orders')).status).toBe(401);
  });

  async function agentCheckout(agent: request.Agent): Promise<void> {
    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN);
    expect(res.status).toBe(201);
  }
});
