'use strict';

/**
 * Deterministic demo catalog. Skips silently when catalog data already
 * exists, so re-running `db:seed` never duplicates rows. Development/demo
 * use only — tests build their own fixtures.
 */
const CATEGORIES = [
  { slug: 'cpus', name: 'Processors', description: 'Desktop CPUs for gaming and workstations.' },
  { slug: 'gpus', name: 'Graphics Cards', description: 'Discrete GPUs for gaming and rendering.' },
  { slug: 'ssds', name: 'Solid State Drives', description: 'NVMe SSDs for fast storage.' },
];

const BRANDS = [
  { slug: 'novacore', name: 'NovaCore' },
  { slug: 'apex-circuits', name: 'Apex Circuits' },
  { slug: 'voltedge', name: 'VoltEdge' },
];

const PRODUCTS = [
  {
    slug: 'novacore-x9-24-core',
    name: 'NovaCore X9 24-Core Processor',
    description: 'Flagship 24-core desktop processor with boost clocks for gaming rigs.',
    priceCents: 58900,
    stock: 14,
    category: 'cpus',
    brand: 'novacore',
    images: 2,
  },
  {
    slug: 'novacore-x5-12-core',
    name: 'NovaCore X5 12-Core Processor',
    description: 'Mid-range 12-core processor, ideal price-to-performance pick.',
    priceCents: 24900,
    stock: 0,
    category: 'cpus',
    brand: 'novacore',
    images: 1,
  },
  {
    slug: 'apex-rtx-5070-12gb',
    name: 'Apex RTX 5070 12GB',
    description: '12GB graphics card for 1440p high-refresh gaming.',
    priceCents: 54900,
    stock: 7,
    category: 'gpus',
    brand: 'apex-circuits',
    images: 2,
  },
  {
    slug: 'voltedge-rx-9060-xt-16gb',
    name: 'VoltEdge RX 9060 XT 16GB',
    description: '16GB card with excellent rasterization performance per dollar.',
    priceCents: 34900,
    stock: 22,
    category: 'gpus',
    brand: 'voltedge',
    images: 1,
  },
  {
    slug: 'novacore-swift-2tb-nvme',
    name: 'NovaCore Swift 2TB NVMe SSD',
    description: 'Gen4 NVMe drive with 2TB capacity and heatsink option.',
    priceCents: 14900,
    stock: 40,
    category: 'ssds',
    brand: 'novacore',
    images: 1,
  },
  {
    slug: 'apex-vault-4tb-nvme',
    name: 'Apex Vault 4TB NVMe SSD',
    description: 'Discontinued 4TB model, kept for order-history reference.',
    priceCents: 27900,
    stock: 3,
    isActive: false,
    category: 'ssds',
    brand: 'apex-circuits',
    images: 0,
  },
];

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::int AS count FROM categories;',
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    if (existing[0].count > 0) {
      console.log('Demo catalog already seeded, skipping.');
      return;
    }

    const now = new Date();
    const categoryIds = {};
    for (const category of CATEGORIES) {
      const id = crypto.randomUUID();
      categoryIds[category.slug] = id;
      await queryInterface.bulkInsert('categories', [
        {
          id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parent_id: null,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const brandIds = {};
    for (const brand of BRANDS) {
      const id = crypto.randomUUID();
      brandIds[brand.slug] = id;
      await queryInterface.bulkInsert('brands', [
        { id, name: brand.name, slug: brand.slug, created_at: now, updated_at: now },
      ]);
    }

    for (const product of PRODUCTS) {
      const id = crypto.randomUUID();
      await queryInterface.bulkInsert('products', [
        {
          id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price_cents: product.priceCents,
          stock: product.stock,
          is_active: product.isActive ?? true,
          category_id: categoryIds[product.category],
          brand_id: brandIds[product.brand],
          created_at: now,
          updated_at: now,
        },
      ]);
      for (let index = 0; index < product.images; index += 1) {
        await queryInterface.bulkInsert('product_images', [
          {
            id: crypto.randomUUID(),
            product_id: id,
            url: `https://picsum.photos/seed/${product.slug}-${index}/800/600`,
            alt_text: `${product.name} (image ${index + 1})`,
            position: index,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const slugs = PRODUCTS.map((product) => `'${product.slug}'`).join(', ');
    await queryInterface.sequelize.query(
      `DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE slug IN (${slugs}));`,
    );
    await queryInterface.bulkDelete('products', { slug: PRODUCTS.map((product) => product.slug) });
    await queryInterface.bulkDelete('brands', { slug: BRANDS.map((brand) => brand.slug) });
    await queryInterface.bulkDelete('categories', {
      slug: CATEGORIES.map((category) => category.slug),
    });
  },
};
