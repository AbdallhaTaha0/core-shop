import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Order } from '../src/models/index';
import { ORIGIN, seedProduct } from './helpers/catalog';
import { truncateAll } from './helpers/db';
import { addToCart, customerAgent } from './helpers/orders';

const app = createApp();

const HOME = {
  label: 'home',
  fullName: 'Ada Lovelace',
  line1: '12 Algorithm Ave',
  city: 'Berlin',
  postalCode: '10115',
  country: 'de',
};

async function agent(): Promise<request.Agent> {
  return customerAgent(app);
}

describe('address book', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('starts empty and creates the first address as default', async () => {
    const user = await agent();

    expect((await user.get('/api/v1/addresses')).body).toEqual({ data: [] });

    const created = await user.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME);

    expect(created.status).toBe(201);
    expect(created.body.address).toMatchObject({
      fullName: 'Ada Lovelace',
      country: 'DE',
      isDefault: true,
    });
  });

  it('keeps exactly one default across switches', async () => {
    const user = await agent();
    const first = (await user.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME)).body
      .address as { id: string };
    const second = (
      await user
        .post('/api/v1/addresses')
        .set('Origin', ORIGIN)
        .send({ ...HOME, label: 'work', line1: '99 Circuit St' })
    ).body.address as { id: string; isDefault: boolean };
    expect(second.isDefault).toBe(false);

    const switched = await user
      .patch(`/api/v1/addresses/${second.id}`)
      .set('Origin', ORIGIN)
      .send({ isDefault: true });
    expect(switched.body.address.isDefault).toBe(true);

    const list = (await user.get('/api/v1/addresses')).body.data as Array<{
      id: string;
      isDefault: boolean;
    }>;
    expect(list.filter((item) => item.isDefault).map((item) => item.id)).toEqual([second.id]);
    expect(list.find((item) => item.id === first.id)?.isDefault).toBe(false);
  });

  it('promotes the oldest remaining address when the default is deleted', async () => {
    const user = await agent();
    const first = (await user.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME)).body
      .address as { id: string };
    const second = (
      await user
        .post('/api/v1/addresses')
        .set('Origin', ORIGIN)
        .send({ ...HOME, label: 'work' })
    ).body.address as { id: string };

    expect(await user.delete(`/api/v1/addresses/${first.id}`).set('Origin', ORIGIN)).toMatchObject({
      status: 204,
    });

    const list = (await user.get('/api/v1/addresses')).body.data as Array<{
      id: string;
      isDefault: boolean;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: second.id, isDefault: true });
  });

  it('validates input strictly', async () => {
    const user = await agent();

    for (const body of [
      { ...HOME, country: 'DEU' },
      { ...HOME, city: '' },
      { ...HOME, nickname: 'x' },
    ]) {
      const res = await user.post('/api/v1/addresses').set('Origin', ORIGIN).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    const malformed = await user
      .patch('/api/v1/addresses/not-a-uuid')
      .set('Origin', ORIGIN)
      .send({ city: 'Munich' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('isolates address books per user', async () => {
    const ada = await customerAgent(app, 'ada@example.com');
    const bob = await customerAgent(app, 'bob@example.com');
    const created = (await ada.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME)).body
      .address as { id: string };

    expect((await bob.get('/api/v1/addresses')).body).toEqual({ data: [] });

    const patch = await bob
      .patch(`/api/v1/addresses/${created.id}`)
      .set('Origin', ORIGIN)
      .send({ city: 'Munich' });
    expect(patch.status).toBe(404);
    expect(patch.body.error.code).toBe('ADDRESS_NOT_FOUND');

    const remove = await bob.delete(`/api/v1/addresses/${created.id}`).set('Origin', ORIGIN);
    expect(remove.status).toBe(404);

    expect((await request(app).get('/api/v1/addresses')).status).toBe(401);
  });
});

describe('checkout with an address', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  async function stockedUser(): Promise<{ agent: request.Agent; productId: string }> {
    const agent = await customerAgent(app);
    const seeded = await seedProduct({ priceCents: 5000, stock: 5 });
    await addToCart(agent, seeded.id, 1);
    return { agent, productId: seeded.id };
  }

  it('snapshots the chosen address onto the order', async () => {
    const { agent } = await stockedUser();
    const address = (await agent.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME)).body
      .address as { id: string };

    const res = await agent
      .post('/api/v1/checkout')
      .set('Origin', ORIGIN)
      .send({ addressId: address.id });

    expect(res.status).toBe(201);
    expect(res.body.order.shipping).toMatchObject({
      fullName: 'Ada Lovelace',
      line1: '12 Algorithm Ave',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
    });

    // Later address-book edits never rewrite the shipped snapshot.
    await agent.patch(`/api/v1/addresses/${address.id}`).set('Origin', ORIGIN).send({
      city: 'Munich',
    });
    const refetched = await agent.get(`/api/v1/orders/${res.body.order.id as string}`);
    expect(refetched.body.order.shipping.city).toBe('Berlin');
  });

  it('leaves shipping empty when no address is given', async () => {
    const { agent } = await stockedUser();
    const res = await agent.post('/api/v1/checkout').set('Origin', ORIGIN).send({});
    expect(res.status).toBe(201);
    expect(res.body.order.shipping).toBeNull();
  });

  it('refuses another user\u2019s address before any money moves', async () => {
    const ada = await customerAgent(app, 'ada@example.com');
    const bob = await customerAgent(app, 'bob@example.com');
    const seeded = await seedProduct({ priceCents: 5000, stock: 5 });
    await addToCart(bob, seeded.id, 1);
    const address = (await ada.post('/api/v1/addresses').set('Origin', ORIGIN).send(HOME)).body
      .address as { id: string };

    const res = await bob
      .post('/api/v1/checkout')
      .set('Origin', ORIGIN)
      .send({ addressId: address.id });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');
    expect(await Order.count()).toBe(0);
    expect((await bob.get('/api/v1/cart')).body.cart.items).toHaveLength(1);
  });

  it('rejects malformed address references', async () => {
    const { agent } = await stockedUser();
    const res = await agent
      .post('/api/v1/checkout')
      .set('Origin', ORIGIN)
      .send({ addressId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});
