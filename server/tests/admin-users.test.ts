import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { registerUser } from '../src/services/auth.service';
import { ORIGIN, createAdminUser, loginAgent } from './helpers/catalog';
import { truncateAll } from './helpers/db';

const app = createApp();

async function admin(): Promise<request.Agent> {
  await createAdminUser();
  return loginAgent(app, 'admin@example.com', 'admin-password-1');
}

describe('admin user management', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('rejects unauthenticated and non-admin access', async () => {
    expect((await request(app).get('/api/v1/admin/users')).status).toBe(401);

    await registerUser({ email: 'customer@example.com', password: 'customer-pass-1' });
    const customer = await loginAgent(app, 'customer@example.com', 'customer-pass-1');
    const list = await customer.get('/api/v1/admin/users');
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe('FORBIDDEN');

    const patch = await customer
      .patch('/api/v1/admin/users/123e4567-e89b-12d3-a456-426614174000')
      .set('Origin', ORIGIN)
      .send({ role: 'admin' });
    expect(patch.status).toBe(403);
  });

  it('lists users without secrets, with search and pagination', async () => {
    const agent = await admin();
    await registerUser({ email: 'ada@example.com', password: 'password-123' });
    await registerUser({ email: 'bob@example.com', password: 'password-123' });

    const all = await agent.get('/api/v1/admin/users');
    expect(all.body.meta.total).toBe(3);
    for (const user of all.body.data as Array<Record<string, unknown>>) {
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password_hash');
    }

    const search = await agent.get('/api/v1/admin/users?q=ada@');
    expect(search.body.meta.total).toBe(1);
    expect(search.body.data[0]).toMatchObject({ email: 'ada@example.com', role: 'customer' });

    const paged = await agent.get('/api/v1/admin/users?limit=2');
    expect(paged.body.meta).toMatchObject({ total: 3, totalPages: 2 });
    expect(paged.body.data).toHaveLength(2);
  });

  it('reads a single user without secrets', async () => {
    const agent = await admin();
    const created = await registerUser({ email: 'ada@example.com', password: 'password-123' });

    const res = await agent.get(`/api/v1/admin/users/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', role: 'customer' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    expect(
      (await agent.get('/api/v1/admin/users/123e4567-e89b-12d3-a456-426614174000')).status,
    ).toBe(404);
    expect((await agent.get('/api/v1/admin/users/not-a-uuid')).status).toBe(400);
  });

  it('changes roles, but never its own', async () => {
    const agent = await admin();
    const created = await registerUser({ email: 'ada@example.com', password: 'password-123' });

    const promoted = await agent
      .patch(`/api/v1/admin/users/${created.id}`)
      .set('Origin', ORIGIN)
      .send({ role: 'admin' });
    expect(promoted.status).toBe(200);
    expect(promoted.body.user.role).toBe('admin');

    const demoted = await agent
      .patch(`/api/v1/admin/users/${created.id}`)
      .set('Origin', ORIGIN)
      .send({ role: 'customer' });
    expect(demoted.body.user.role).toBe('customer');

    const invalid = await agent
      .patch(`/api/v1/admin/users/${created.id}`)
      .set('Origin', ORIGIN)
      .send({ role: 'superadmin' });
    expect(invalid.status).toBe(400);

    const missing = await agent
      .patch('/api/v1/admin/users/123e4567-e89b-12d3-a456-426614174000')
      .set('Origin', ORIGIN)
      .send({ role: 'admin' });
    expect(missing.status).toBe(404);

    const adminId = (await agent.get('/api/v1/admin/users?q=admin@')).body.data[0].id as string;
    const selfDemote = await agent
      .patch(`/api/v1/admin/users/${adminId}`)
      .set('Origin', ORIGIN)
      .send({ role: 'customer' });
    expect(selfDemote.status).toBe(403);
    expect(selfDemote.body.error.code).toBe('SELF_DEMOTE_BLOCKED');
  });

  it('requires a fresh login before a promoted role takes effect', async () => {
    const agent = await admin();
    await registerUser({ email: 'ada@example.com', password: 'password-123' });
    const ada = await loginAgent(app, 'ada@example.com', 'password-123');
    const created = (await agent.get('/api/v1/admin/users?q=ada@')).body.data[0].id as string;

    await agent
      .patch(`/api/v1/admin/users/${created}`)
      .set('Origin', ORIGIN)
      .send({ role: 'admin' });

    // The session token still carries the old role until re-login.
    expect((await ada.get('/api/v1/admin/users')).status).toBe(403);

    const fresh = await loginAgent(app, 'ada@example.com', 'password-123');
    expect((await fresh.get('/api/v1/admin/users')).status).toBe(200);
  });
});
