import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Product } from '../src/models/product';
import { registerUser } from '../src/services/auth.service';
import { ORIGIN, seedProduct } from './helpers/catalog';
import { truncateAll } from './helpers/db';

const app = createApp();

function guest(): { agent: request.Agent; post: (path: string) => request.Test } {
  const agent = request.agent(app);
  return {
    agent,
    post: (path: string) => agent.post(path).set('Origin', ORIGIN),
  };
}

describe('guest cart', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('returns an empty cart when the guest has no cart yet', async () => {
    const res = await request(app).get('/api/v1/cart');

    expect(res.status).toBe(200);
    expect(res.body.cart).toMatchObject({ id: null, items: [], itemCount: 0, subtotalCents: 0 });
  });

  it('creates a cart on first add and persists it via cookie', async () => {
    const { agent, post } = guest();
    const seeded = await seedProduct({ priceCents: 25000, stock: 4 });

    const added = await post('/api/v1/cart/items').send({
      productId: seeded.id,
      quantity: 2,
    });

    expect(added.status).toBe(200);
    expect(added.body.cart.items).toHaveLength(1);
    expect(added.body.cart.items[0]).toMatchObject({
      quantity: 2,
      available: true,
      maxQuantity: 4,
      lineTotalCents: 50000,
    });
    expect(added.body.cart).toMatchObject({ itemCount: 2, subtotalCents: 50000 });
    const setCookie = added.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '');
    expect(cookieHeader).toMatch(/cart_id=.+;.+httponly/i);

    const reread = await agent.get('/api/v1/cart');
    expect(reread.body.cart.items).toHaveLength(1);
  });

  it('combines repeated adds of the same product', async () => {
    const { post } = guest();
    const seeded = await seedProduct({ priceCents: 1000, stock: 10 });

    await post('/api/v1/cart/items').send({ productId: seeded.id, quantity: 2 });
    const second = await post('/api/v1/cart/items').send({ productId: seeded.id, quantity: 3 });

    expect(second.body.cart.items).toHaveLength(1);
    expect(second.body.cart.items[0].quantity).toBe(5);
    expect(second.body.cart.subtotalCents).toBe(5000);
  });

  it('caps quantities at available stock', async () => {
    const { post } = guest();
    const seeded = await seedProduct({ priceCents: 1000, stock: 3 });

    const res = await post('/api/v1/cart/items').send({ productId: seeded.id, quantity: 999 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(3);
  });

  it('rejects unavailable products, bad quantities, and unknown products', async () => {
    const { agent, post } = guest();
    const inactive = await seedProduct({ isActive: false });
    const empty = await seedProduct({ stock: 0 });
    const seeded = await seedProduct({});

    const inactiveRes = await post('/api/v1/cart/items').send({ productId: inactive.id });
    expect(inactiveRes.status).toBe(409);
    expect(inactiveRes.body.error.code).toBe('PRODUCT_UNAVAILABLE');

    const emptyRes = await post('/api/v1/cart/items').send({ productId: empty.id });
    expect(emptyRes.status).toBe(409);

    const missing = await post('/api/v1/cart/items').send({
      productId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(missing.status).toBe(404);

    for (const body of [
      { productId: seeded.id, quantity: 0 },
      { productId: seeded.id, quantity: 1000 },
    ]) {
      const res = await post('/api/v1/cart/items').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    // Nothing was added by the rejected requests.
    expect((await agent.get('/api/v1/cart')).body.cart.items).toHaveLength(0);
  });

  it('updates quantities with stock clamping and removes items', async () => {
    const { agent, post } = guest();
    const seeded = await seedProduct({ priceCents: 2000, stock: 5 });

    const added = await post('/api/v1/cart/items').send({ productId: seeded.id, quantity: 2 });
    const itemId = added.body.cart.items[0].id as string;

    const patch = (quantity: number): request.Test =>
      agent.patch(`/api/v1/cart/items/${itemId}`).set('Origin', ORIGIN).send({ quantity });

    const clamped = await patch(999);
    expect(clamped.status).toBe(200);
    expect(clamped.body.cart.items[0].quantity).toBe(5);

    const lowered = await patch(1);
    expect(lowered.body.cart.items[0].quantity).toBe(1);
    expect(lowered.body.cart.subtotalCents).toBe(2000);

    const removed = await agent.delete(`/api/v1/cart/items/${itemId}`).set('Origin', ORIGIN);
    expect(removed.status).toBe(200);
    expect(removed.body.cart.items).toHaveLength(0);

    // Unknown and malformed item IDs never resolve to someone else's data.
    expect(
      (
        await agent
          .delete('/api/v1/cart/items/123e4567-e89b-12d3-a456-426614174000')
          .set('Origin', ORIGIN)
      ).status,
    ).toBe(200);
    const malformed = await agent
      .patch('/api/v1/cart/items/not-a-uuid')
      .set('Origin', ORIGIN)
      .send({ quantity: 1 });
    expect(malformed.status).toBe(400);
  });

  it('flags items whose product became unavailable', async () => {
    const { agent, post } = guest();
    const seeded = await seedProduct({ priceCents: 3000, stock: 2 });

    await post('/api/v1/cart/items').send({ productId: seeded.id, quantity: 2 });
    await Product.update({ isActive: false }, { where: { id: seeded.id } });

    const res = await agent.get('/api/v1/cart');
    expect(res.body.cart.items[0]).toMatchObject({ available: false, maxQuantity: 0 });
    expect(res.body.cart).toMatchObject({ subtotalCents: 0, unavailableCount: 1 });
  });
});

describe('authenticated cart and login merge', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  async function loginAs(email: string, password: string): Promise<request.Agent> {
    await registerUser({ email, password });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email, password });
    return agent;
  }

  it('keeps a persistent user cart across requests', async () => {
    const agent = await loginAs('ada@example.com', 'password-123');
    const seeded = await seedProduct({ priceCents: 5000 });

    await agent.post('/api/v1/cart/items').set('Origin', ORIGIN).send({ productId: seeded.id });

    const reread = await agent.get('/api/v1/cart');
    expect(reread.body.cart.items).toHaveLength(1);
    expect(reread.body.cart.subtotalCents).toBe(5000);
  });

  it('merges the guest cart into the user cart on login', async () => {
    const shared = await seedProduct({ priceCents: 1000, stock: 5 });
    const guestOnly = await seedProduct({ priceCents: 2000, stock: 5 });
    const userOnly = await seedProduct({ priceCents: 4000, stock: 5 });

    // Guest shops first.
    const guestAgent = request.agent(app);
    await guestAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: shared.id, quantity: 2 });
    await guestAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: guestOnly.id, quantity: 1 });

    // The same browser already had a user cart with the shared product.
    await registerUser({ email: 'ada@example.com', password: 'password-123' });
    const userAgent = request.agent(app);
    await userAgent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });
    await userAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: shared.id, quantity: 1 });
    await userAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: userOnly.id, quantity: 1 });

    // Logging in again with the guest cookie merges deterministically.
    const login = await guestAgent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });
    expect(login.body.guestCartMerge).toEqual({ mergedItems: 2, skippedItems: 0 });

    const cart = (await guestAgent.get('/api/v1/cart')).body.cart;
    // Shared: 2 guest + 1 user = 3; plus one guest-only and one user-only item.
    expect(cart.itemCount).toBe(5);
    expect(cart.subtotalCents).toBe(3 * 1000 + 2000 + 4000);
  });

  it('caps merged quantities at stock and skips unavailable items', async () => {
    const scarce = await seedProduct({ priceCents: 1000, stock: 3 });
    const gone = await seedProduct({ priceCents: 2000, stock: 5 });

    await registerUser({ email: 'ada@example.com', password: 'password-123' });

    const guestAgent = request.agent(app);
    await guestAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: scarce.id, quantity: 2 });
    await guestAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: gone.id, quantity: 1 });

    // The product is discontinued after the guest added it.
    await Product.update({ isActive: false }, { where: { id: gone.id } });

    // User cart already holds 2 of the scarce product: 2 + 2 capped at 3.
    const userAgent = request.agent(app);
    await userAgent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });
    await userAgent
      .post('/api/v1/cart/items')
      .set('Origin', ORIGIN)
      .send({ productId: scarce.id, quantity: 2 });

    const login = await guestAgent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });
    expect(login.body.guestCartMerge).toEqual({ mergedItems: 1, skippedItems: 1 });

    const cart = (await guestAgent.get('/api/v1/cart')).body.cart;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it('returns null merge info when logging in without a guest cart', async () => {
    await registerUser({ email: 'ada@example.com', password: 'password-123' });
    const login = await request(app).post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });
    expect(login.body.guestCartMerge).toBeNull();
  });
});
