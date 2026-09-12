'use strict';

/**
 * Creates `order_items`. Rows are immutable purchase history: they cascade
 * with their order but RESTRICT product deletion, so history can never lose
 * the product it points at.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      product_slug: {
        type: Sequelize.STRING(220),
        allowNull: false,
      },
      product_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      unit_price_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      line_total_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addConstraint('order_items', {
      fields: ['quantity'],
      type: 'check',
      name: 'order_items_quantity_positive',
      where: { quantity: { [Sequelize.Op.gte]: 1 } },
    });
    await queryInterface.addIndex('order_items', ['order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
