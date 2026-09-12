import request from 'supertest';
import type { Express } from 'express';
import { registerUser } from '../../src/services/auth.service';
import { ORIGIN, loginAgent } from './catalog';

export async function customerAgent(
  app: Express,
  email = `customer-${Math.random().toString(36).slice(2)}@example.com`,
  password = 'password-123',
): Promise<request.Agent> {
  await registerUser({ email, password });
  return loginAgent(app, email, password);
}

export async function addToCart(
  agent: request.Agent,
  productId: string,
  quantity = 1,
): Promise<request.Response> {
  return agent.post('/api/v1/cart/items').set('Origin', ORIGIN).send({ productId, quantity });
}
