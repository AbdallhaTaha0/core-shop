import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { AuditLog } from '../src/models/index';
import { registerUser } from '../src/services/auth.service';
import { ORIGIN, createAdminUser, loginAgent, seedProduct } from './helpers/catalog';
import { truncateAll } from './helpers/db';

const app = createApp();

async function actions(): Promise<string[]> {
  return (await AuditLog.findAll({ attributes: ['action'] })).map((row) => row.action);
}

describe('audit trail', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('records registration, login, failed login, and logout', async () => {
    const email = 'ada@example.com';
    await request(app).post('/api/v1/auth/register').set('Origin', ORIGIN).send({
      email,
      password: 'password-123',
    });

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email,
      password: 'password-123',
    });
    await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: 'wrong-pass-1' });
    await agent.post('/api/v1/auth/logout').set('Origin', ORIGIN);

    const rows = await AuditLog.findAll({ order: [['createdAt', 'ASC']] });
    expect(rows.map((row) => row.action)).toEqual([
      'auth.register',
      'auth.login',
      'auth.login_failed',
      'auth.logout',
    ]);
    // Failed logins keep the email for abuse analysis but never secrets.
    const failed = rows[2];
    expect(failed?.actorUserId).toBeNull();
    expect(failed?.metadata).toMatchObject({ email });
    expect(JSON.stringify(failed?.metadata)).not.toContain('wrong-pass-1');
    // Successful rows are attributed and carry a client address.
    expect(rows[0]?.actorUserId).toBeTypeOf('string');
    expect(rows[0]?.ipAddress).toBeTypeOf('string');
  });

  it('records admin catalog, order, and role changes', async () => {
    await createAdminUser();
    const agent = await loginAgent(app, 'admin@example.com', 'admin-password-1');
    const seeded = await seedProduct({ name: 'Audit Board', priceCents: 1000, stock: 5 });

    await agent
      .patch(`/api/v1/admin/products/${seeded.id}`)
      .set('Origin', ORIGIN)
      .send({ stock: 9 });
    await agent.delete(`/api/v1/admin/products/${seeded.id}`).set('Origin', ORIGIN);

    const customer = await registerUser({ email: 'ada@example.com', password: 'password-123' });
    await agent
      .patch(`/api/v1/admin/users/${customer.id}`)
      .set('Origin', ORIGIN)
      .send({ role: 'admin' });

    expect(await actions()).toContain('admin.product.update');
    expect(await actions()).toContain('admin.product.delete');
    expect(await actions()).toContain('admin.user.role');

    const roleRow = await AuditLog.findOne({ where: { action: 'admin.user.role' } });
    expect(roleRow?.entityType).toBe('user');
    expect(roleRow?.entityId).toBe(customer.id);
    expect(roleRow?.metadata).toMatchObject({ role: 'admin' });
    expect(roleRow?.actorUserId).not.toBeNull();
  });

  it('serves the trail to admins with filtering', async () => {
    await createAdminUser();
    const agent = await loginAgent(app, 'admin@example.com', 'admin-password-1');

    const all = await agent.get('/api/v1/admin/audit-logs');
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBeGreaterThan(0);

    const filtered = await agent.get('/api/v1/admin/audit-logs?action=auth.login');
    expect(filtered.body.meta.total).toBeGreaterThanOrEqual(1);
    for (const row of filtered.body.data as Array<{ action: string }>) {
      expect(row.action).toBe('auth.login');
    }

    await registerUser({ email: 'customer@example.com', password: 'customer-pass-1' });
    const customer = await loginAgent(app, 'customer@example.com', 'customer-pass-1');
    expect((await customer.get('/api/v1/admin/audit-logs')).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/audit-logs')).status).toBe(401);
  });

  it('never breaks the main flow when the audit write fails', async () => {
    const spy = vi.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('audit store down'));

    const res = await request(app).post('/api/v1/auth/register').set('Origin', ORIGIN).send({
      email: 'ada@example.com',
      password: 'password-123',
    });

    expect(res.status).toBe(201);
    expect(await AuditLog.count()).toBe(0);
    spy.mockRestore();
  });
});
