import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ProductImage } from '../src/models/productImage';
import { registerUser } from '../src/services/auth.service';
import {
  ORIGIN,
  createAdminUser,
  loginAgent,
  seedBrand,
  seedCategory,
  seedProduct,
} from './helpers/catalog';
import { truncateAll } from './helpers/db';

const app = createApp();

async function admin(): Promise<request.Agent> {
  await createAdminUser();
  return loginAgent(app, 'admin@example.com', 'admin-password-1');
}

describe('admin authorization', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('rejects unauthenticated and non-admin catalog writes', async () => {
    const unauthenticated = await request(app)
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({});
    expect(unauthenticated.status).toBe(401);

    await registerUser({ email: 'customer@example.com', password: 'customer-pass-1' });
    const customer = await loginAgent(app, 'customer@example.com', 'customer-pass-1');
    const forbidden = await customer.post('/api/v1/admin/products').set('Origin', ORIGIN).send({});
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });
});

describe('admin product management', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('creates a product with an auto-generated slug and images', async () => {
    const agent = await admin();
    const category = await seedCategory({ name: 'CPUs', slug: 'cpus' });
    const brand = await seedBrand({ name: 'NovaCore', slug: 'novacore' });

    const res = await agent
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({
        name: 'NovaCore X9 24-Core',
        description: 'Flagship chip',
        priceCents: 58900,
        stock: 4,
        categoryId: category.id,
        brandId: brand.id,
        images: [{ url: 'https://example.com/x9.jpg', altText: 'X9' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.product).toMatchObject({ slug: 'novacore-x9-24-core', priceCents: 58900 });
    expect(res.body.product.images).toHaveLength(1);
  });

  it('rejects duplicate slugs, unknown relations, and invalid money', async () => {
    const agent = await admin();
    const category = await seedCategory({ slug: 'cpus' });
    const brand = await seedBrand({ slug: 'novacore' });
    await seedProduct({ slug: 'taken-slug', categoryId: category.id, brandId: brand.id });
    const base = {
      name: 'Something',
      priceCents: 1000,
      categoryId: category.id,
      brandId: brand.id,
    };

    const duplicate = await agent
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({ ...base, slug: 'taken-slug' });
    expect(duplicate.status).toBe(409);

    const unknownCategory = await agent
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({ ...base, categoryId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(unknownCategory.status).toBe(404);
    expect(unknownCategory.body.error.code).toBe('CATEGORY_NOT_FOUND');

    const negativePrice = await agent
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({ ...base, priceCents: -5 });
    expect(negativePrice.status).toBe(400);

    const unknownField = await agent
      .post('/api/v1/admin/products')
      .set('Origin', ORIGIN)
      .send({ ...base, isFeatured: true });
    expect(unknownField.status).toBe(400);
  });

  it('updates price, stock, and images; deletes with image cascade', async () => {
    const agent = await admin();
    const seeded = await seedProduct({ priceCents: 10000, stock: 2 });

    const updated = await agent
      .patch(`/api/v1/admin/products/${seeded.id}`)
      .set('Origin', ORIGIN)
      .send({ priceCents: 12000, stock: 9, images: [{ url: 'https://example.com/new.jpg' }] });
    expect(updated.status).toBe(200);
    expect(updated.body.product).toMatchObject({ priceCents: 12000, stock: 9 });
    expect(updated.body.product.images).toHaveLength(1);

    const deleted = await agent.delete(`/api/v1/admin/products/${seeded.id}`);
    expect(deleted.status).toBe(204);

    expect((await request(app).get(`/api/v1/products/${seeded.slug}`)).status).toBe(404);
    expect(await ProductImage.count({ where: { productId: seeded.id } })).toBe(0);

    const missing = await agent
      .patch('/api/v1/admin/products/123e4567-e89b-12d3-a456-426614174000')
      .set('Origin', ORIGIN)
      .send({ stock: 1 });
    expect(missing.status).toBe(404);
  });

  it('lists inactive products for admins on request', async () => {
    const agent = await admin();
    await seedProduct({ isActive: true });
    await seedProduct({ name: 'Draft', isActive: false });

    const def = await agent.get('/api/v1/admin/products');
    expect(def.body.meta.total).toBe(1);

    const all = await agent.get('/api/v1/admin/products?includeInactive=true');
    expect(all.body.meta.total).toBe(2);
  });
});

describe('admin category and brand management', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('manages categories including hierarchy guards', async () => {
    const agent = await admin();

    const parent = await agent
      .post('/api/v1/admin/categories')
      .set('Origin', ORIGIN)
      .send({ name: 'Storage' });
    expect(parent.status).toBe(201);
    expect(parent.body.category.slug).toBe('storage');

    const child = await agent
      .post('/api/v1/admin/categories')
      .set('Origin', ORIGIN)
      .send({ name: 'NVMe SSDs', parentId: parent.body.category.id });
    expect(child.status).toBe(201);

    const selfParent = await agent
      .patch(`/api/v1/admin/categories/${parent.body.category.id}`)
      .set('Origin', ORIGIN)
      .send({ parentId: parent.body.category.id });
    expect(selfParent.status).toBe(400);
    expect(selfParent.body.error.code).toBe('CATEGORY_PARENT_CYCLE');

    const cycle = await agent
      .patch(`/api/v1/admin/categories/${parent.body.category.id}`)
      .set('Origin', ORIGIN)
      .send({ parentId: child.body.category.id });
    expect(cycle.status).toBe(400);

    const blockedByChildren = await agent.delete(
      `/api/v1/admin/categories/${parent.body.category.id}`,
    );
    expect(blockedByChildren.status).toBe(409);
    expect(blockedByChildren.body.error.code).toBe('CATEGORY_HAS_CHILDREN');
  });

  it('protects referenced categories and brands from deletion', async () => {
    const agent = await admin();
    const seeded = await seedProduct({});

    const category = await agent.delete(`/api/v1/admin/categories/${seeded.categoryId}`);
    expect(category.status).toBe(409);
    expect(category.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');

    const brand = await agent.delete(`/api/v1/admin/brands/${seeded.brandId}`);
    expect(brand.status).toBe(409);
    expect(brand.body.error.code).toBe('BRAND_HAS_PRODUCTS');
  });

  it('creates and renames brands', async () => {
    const agent = await admin();

    const created = await agent
      .post('/api/v1/admin/brands')
      .set('Origin', ORIGIN)
      .send({ name: 'VoltEdge' });
    expect(created.status).toBe(201);
    expect(created.body.brand.slug).toBe('voltedge');

    const renamed = await agent
      .patch(`/api/v1/admin/brands/${created.body.brand.id}`)
      .set('Origin', ORIGIN)
      .send({ name: 'VoltEdge Labs' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.brand.name).toBe('VoltEdge Labs');
  });
});
