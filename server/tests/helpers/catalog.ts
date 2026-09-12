import request from 'supertest';
import type { Express } from 'express';
import type { Brand, Category } from '../../src/models/index';
import { User } from '../../src/models/index';
import { hashPassword } from '../../src/utils/password';
import { createBrand } from '../../src/services/brands.service';
import { createCategory } from '../../src/services/categories.service';
import { createProduct } from '../../src/services/products.service';

export const ORIGIN = 'http://localhost:5173';

export async function seedCategory(overrides?: {
  name?: string;
  slug?: string;
  parentId?: string | null;
}): Promise<Category> {
  return createCategory({
    name: overrides?.name ?? `Category ${Math.random().toString(36).slice(2)}`,
    ...(overrides?.slug !== undefined ? { slug: overrides.slug } : {}),
    ...(overrides?.parentId !== undefined ? { parentId: overrides.parentId } : {}),
  });
}

export async function seedBrand(overrides?: { name?: string; slug?: string }): Promise<Brand> {
  return createBrand({
    name: overrides?.name ?? `Brand ${Math.random().toString(36).slice(2)}`,
    ...(overrides?.slug !== undefined ? { slug: overrides.slug } : {}),
  });
}

export async function seedProduct(overrides?: {
  name?: string;
  slug?: string;
  priceCents?: number;
  stock?: number;
  isActive?: boolean;
  description?: string;
  categoryId?: string;
  brandId?: string;
  images?: Array<{ url: string; altText?: string }>;
}): Promise<{ id: string; slug: string; categoryId: string; brandId: string }> {
  const categoryId =
    overrides?.categoryId ??
    (await seedCategory({ name: `Cat ${Math.random().toString(36).slice(2)}` })).id;
  const brandId =
    overrides?.brandId ??
    (await seedBrand({ name: `Br ${Math.random().toString(36).slice(2)}` })).id;
  const created = await createProduct({
    name: overrides?.name ?? `Product ${Math.random().toString(36).slice(2)}`,
    priceCents: overrides?.priceCents ?? 10000,
    stock: overrides?.stock ?? 5,
    isActive: overrides?.isActive ?? true,
    categoryId,
    brandId,
    ...(overrides?.slug !== undefined ? { slug: overrides.slug } : {}),
    ...(overrides?.description !== undefined ? { description: overrides.description } : {}),
    images: overrides?.images ?? [],
  });
  return { id: created.id, slug: created.slug, categoryId, brandId };
}

export async function createAdminUser(
  email = 'admin@example.com',
  password = 'admin-password-1',
): Promise<void> {
  await User.create({ email, passwordHash: await hashPassword(password), role: 'admin' });
}

export async function loginAgent(
  app: Express,
  email: string,
  password: string,
): Promise<request.Agent> {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}
