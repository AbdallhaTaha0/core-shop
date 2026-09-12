'use strict';

/**
 * Creates `products`. Money is integer minor units with a CHECK floor at 0;
 * stock likewise. Category/brand deletes are RESTRICTed while products
 * reference them. A trigram GIN index accelerates `ILIKE '%term%'` search.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(220),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      brand_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'brands', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addConstraint('products', {
      fields: ['price_cents'],
      type: 'check',
      name: 'products_price_cents_non_negative',
      where: { price_cents: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('products', {
      fields: ['stock'],
      type: 'check',
      name: 'products_stock_non_negative',
      where: { stock: { [Sequelize.Op.gte]: 0 } },
    });

    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['brand_id']);
    await queryInterface.addIndex('products', ['price_cents']);
    await queryInterface.addIndex('products', ['is_active']);

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (name gin_trgm_ops);',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS products_name_trgm;');
    await queryInterface.dropTable('products');
  },
};
