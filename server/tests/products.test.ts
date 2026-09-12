import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { seedBrand, seedCategory, seedProduct } from './helpers/catalog';
import { truncateAll } from './helpers/db';

const app = createApp();

describe('GET /api/v1/products', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('returns an empty page with pagination meta when no products exist', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
  });

  it('paginates results', async () => {
    for (let index = 0; index < 25; index += 1) {
      await seedProduct({ name: `Widget ${index.toString().padStart(2, '0')}` });
    }

    const first = await request(app).get('/api/v1/products');
    expect(first.body.meta).toEqual({ page: 1, limit: 20, total: 25, totalPages: 2 });
    expect(first.body.data).toHaveLength(20);

    const second = await request(app).get('/api/v1/products?page=2');
    expect(second.body.meta.page).toBe(2);
    expect(second.body.data).toHaveLength(5);
  });

  it('searches names and descriptions case-insensitively', async () => {
    await seedProduct({ name: 'NovaCore X9 Processor' });
    await seedProduct({ name: 'Apex Card', description: 'Blazing processor for renders' });
    await seedProduct({ name: 'Unrelated Cable' });

    const byName = await request(app).get('/api/v1/products?q=novacore');
    expect(byName.body.meta.total).toBe(1);

    const byDescription = await request(app).get('/api/v1/products?q=PROCESSOR');
    expect(byDescription.body.meta.total).toBe(2);

    const none = await request(app).get('/api/v1/products?q=zzz-no-match');
    expect(none.body).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('filters by category and brand slugs', async () => {
    const category = await seedCategory({ name: 'CPUs', slug: 'cpus' });
    const brand = await seedBrand({ name: 'NovaCore', slug: 'novacore' });
    await seedProduct({ categoryId: category.id, brandId: brand.id });
    await seedProduct({});

    const byCategory = await request(app).get('/api/v1/products?category=cpus');
    expect(byCategory.body.meta.total).toBe(1);

    const byBrand = await request(app).get('/api/v1/products?brand=novacore');
    expect(byBrand.body.meta.total).toBe(1);

    const unknownCategory = await request(app).get('/api/v1/products?category=nope');
    expect(unknownCategory.status).toBe(404);
    expect(unknownCategory.body.error.code).toBe('CATEGORY_NOT_FOUND');

    const unknownBrand = await request(app).get('/api/v1/products?brand=nope');
    expect(unknownBrand.status).toBe(404);
    expect(unknownBrand.body.error.code).toBe('BRAND_NOT_FOUND');
  });

  it('filters by price range and stock availability', async () => {
    await seedProduct({ priceCents: 10000, stock: 3 });
    await seedProduct({ priceCents: 50000, stock: 0 });
    await seedProduct({ priceCents: 90000, stock: 9 });

    const range = await request(app).get('/api/v1/products?minPrice=20000&maxPrice=60000');
    expect(range.body.meta.total).toBe(1);

    const inStock = await request(app).get('/api/v1/products?inStock=true');
    expect(inStock.body.meta.total).toBe(2);

    const inverted = await request(app).get('/api/v1/products?minPrice=60000&maxPrice=20000');
    expect(inverted.status).toBe(400);
    expect(inverted.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sorts by price and excludes inactive products', async () => {
    await seedProduct({ name: 'Cheap', priceCents: 1000 });
    await seedProduct({ name: 'Pricey', priceCents: 90000 });
    await seedProduct({ name: 'Hidden', priceCents: 500, isActive: false });

    const asc = await request(app).get('/api/v1/products?sort=price_asc');
    expect(asc.body.data.map((item: { name: string }) => item.name)).toEqual(['Cheap', 'Pricey']);

    const desc = await request(app).get('/api/v1/products?sort=price_desc');
    expect(desc.body.data.map((item: { name: string }) => item.name)).toEqual(['Pricey', 'Cheap']);
  });

  it('rejects invalid pagination and sort values', async () => {
    const badPage = await request(app).get('/api/v1/products?page=0');
    expect(badPage.status).toBe(400);

    const badSort = await request(app).get('/api/v1/products?sort=random');
    expect(badSort.status).toBe(400);
  });
});

describe('GET /api/v1/products/:slug', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('returns the product with category, brand, and ordered images', async () => {
    const category = await seedCategory({ name: 'CPUs', slug: 'cpus' });
    const brand = await seedBrand({ name: 'NovaCore', slug: 'novacore' });
    await seedProduct({
      name: 'NovaCore X9',
      slug: 'novacore-x9',
      description: 'Flagship chip',
      priceCents: 58900,
      categoryId: category.id,
      brandId: brand.id,
      images: [
        { url: 'https://example.com/b.jpg', altText: 'Back' },
        { url: 'https://example.com/a.jpg', altText: 'Front' },
      ],
    });

    const res = await request(app).get('/api/v1/products/novacore-x9');

    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({
      slug: 'novacore-x9',
      priceCents: 58900,
      category: { slug: 'cpus', name: 'CPUs' },
      brand: { slug: 'novacore', name: 'NovaCore' },
    });
    expect(res.body.product.images.map((image: { url: string }) => image.url)).toEqual([
      'https://example.com/b.jpg',
      'https://example.com/a.jpg',
    ]);
  });

  it('returns 404 for unknown, inactive, and malformed slugs', async () => {
    await seedProduct({ slug: 'hidden-gem', isActive: false });

    expect((await request(app).get('/api/v1/products/no-such-product')).status).toBe(404);

    const inactive = await request(app).get('/api/v1/products/hidden-gem');
    expect(inactive.status).toBe(404);
    expect(inactive.body.error.code).toBe('PRODUCT_NOT_FOUND');

    const malformed = await request(app).get('/api/v1/products/Bad_Slug!');
    expect(malformed.status).toBe(400);
  });
});

describe('GET /api/v1/categories and /api/v1/brands', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('lists categories and brands alphabetically', async () => {
    await seedCategory({ name: 'SSDs', slug: 'ssds' });
    await seedCategory({ name: 'CPUs', slug: 'cpus' });
    await seedBrand({ name: 'VoltEdge', slug: 'voltedge' });
    await seedBrand({ name: 'Apex Circuits', slug: 'apex-circuits' });

    const categories = await request(app).get('/api/v1/categories');
    expect(categories.body.data.map((item: { slug: string }) => item.slug)).toEqual([
      'cpus',
      'ssds',
    ]);

    const brands = await request(app).get('/api/v1/brands');
    expect(brands.body.data.map((item: { slug: string }) => item.slug)).toEqual([
      'apex-circuits',
      'voltedge',
    ]);
  });
});
