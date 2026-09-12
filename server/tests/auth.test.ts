import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { User } from '../src/models/user';
import { registerUser } from '../src/services/auth.service';
import { comparePassword } from '../src/utils/password';
import { truncateAll } from './helpers/db';

const ORIGIN = 'http://localhost:5173';
const EMAIL = 'ada@example.com';
const PASSWORD = 'correct-horse-123';

const app = createApp();

function post(path: string): request.Test {
  return request(app).post(path).set('Origin', ORIGIN);
}

function responseCookies(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  if (Array.isArray(raw)) {
    return raw.join('; ');
  }
  return raw ?? '';
}

async function seedUser(email = EMAIL, password = PASSWORD): Promise<void> {
  await registerUser({ email, password });
}

describe('POST /api/v1/auth/register', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('creates a customer, returns 201 without secrets, and sets the session cookie', async () => {
    const res = await post('/api/v1/auth/register').send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: EMAIL, role: 'customer' });
    expect(res.body.user.id).toBeTypeOf('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body).not.toHaveProperty('token');

    const cookies = responseCookies(res);
    expect(cookies).toContain('access_token=');
    expect(cookies).toMatch(/httponly/i);
    expect(cookies).toMatch(/samesite=lax/i);
  });

  it('rejects a duplicate email with 409', async () => {
    await seedUser();

    const res = await post('/api/v1/auth/register').send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });

  it('treats email case-insensitively for duplicates', async () => {
    await seedUser();

    const res = await post('/api/v1/auth/register').send({
      email: 'ADA@EXAMPLE.COM',
      password: PASSWORD,
    });

    expect(res.status).toBe(409);
  });

  it('rejects invalid email, short and overlong passwords with 400', async () => {
    for (const body of [
      { email: 'not-an-email', password: PASSWORD },
      { email: EMAIL, password: 'short' },
      { email: EMAIL, password: 'x'.repeat(73) },
    ]) {
      const res = await post('/api/v1/auth/register').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects a smuggled role instead of escalating privileges', async () => {
    const res = await post('/api/v1/auth/register').send({
      email: EMAIL,
      password: PASSWORD,
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(await User.count({ where: { role: 'admin' } })).toBe(0);
  });

  it('blocks cross-origin and origin-less posts (CSRF)', async () => {
    const noOrigin = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: EMAIL, password: PASSWORD });
    expect(noOrigin.status).toBe(403);
    expect(noOrigin.body.error.code).toBe('CSRF_BLOCKED');

    const evil = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', 'https://evil.example')
      .send({ email: EMAIL, password: PASSWORD });
    expect(evil.status).toBe(403);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await truncateAll();
    await seedUser();
  });

  it('logs in with correct credentials and sets the session cookie', async () => {
    const res = await post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: EMAIL, role: 'customer' });
    expect(responseCookies(res)).toContain('access_token=');
  });

  it('rejects wrong password and unknown email identically (no enumeration)', async () => {
    const wrongPassword = await post('/api/v1/auth/login').send({
      email: EMAIL,
      password: 'wrong-password-1',
    });
    const unknownEmail = await post('/api/v1/auth/login').send({
      email: 'nobody@example.com',
      password: PASSWORD,
    });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    }
  });

  it('rejects malformed login bodies with 400', async () => {
    const res = await post('/api/v1/auth/login').send({ email: EMAIL });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me and POST /api/v1/auth/logout', () => {
  beforeEach(async () => {
    await truncateAll();
    await seedUser();
  });

  it('returns the current user for an authenticated session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: EMAIL,
      password: PASSWORD,
    });

    const res = await agent.get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: EMAIL, role: 'customer' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects missing, invalid, and expired tokens with 401', async () => {
    const missing = await request(app).get('/api/v1/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');

    const invalid = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'access_token=bogus-token');
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_TOKEN');

    const user = await User.findOne({ where: { email: EMAIL } });
    const expired = jwt.sign(
      { sub: user?.id, role: 'customer', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET as string,
    );
    const expiredRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `access_token=${expired}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects sessions for deleted accounts', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: EMAIL,
      password: PASSWORD,
    });
    await User.destroy({ where: { email: EMAIL } });

    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs out by clearing the session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({
      email: EMAIL,
      password: PASSWORD,
    });

    const logout = await agent.post('/api/v1/auth/logout').set('Origin', ORIGIN);
    expect(logout.status).toBe(200);
    expect(responseCookies(logout)).toMatch(/access_token=;/);

    const after = await agent.get('/api/v1/auth/me');
    expect(after.status).toBe(401);
  });
});

describe('password storage', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('stores a salted hash, never the plaintext password', async () => {
    await post('/api/v1/auth/register').send({ email: EMAIL, password: PASSWORD });

    const user = await User.findOne({ where: { email: EMAIL } });
    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe(PASSWORD);
    expect(await comparePassword(PASSWORD, user?.passwordHash as string)).toBe(true);
    expect(user?.role).toBe('customer');
  });
});
