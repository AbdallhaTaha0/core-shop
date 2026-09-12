'use strict';

/**
 * Creates `cart_items`. A product appears at most once per cart (unique
 * pair); quantities combine instead of duplicating. Items die with their
 * cart, and with their product: a hard-deleted product vanishes from carts
 * rather than dangling (deactivation via is_active is the normal path).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cart_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'carts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      quantity: {
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

    await queryInterface.addConstraint('cart_items', {
      fields: ['quantity'],
      type: 'check',
      name: 'cart_items_quantity_positive',
      where: { quantity: { [Sequelize.Op.gte]: 1 } },
    });
    await queryInterface.addConstraint('cart_items', {
      fields: ['cart_id', 'product_id'],
      type: 'unique',
      name: 'cart_items_cart_product_unique',
    });
    await queryInterface.addIndex('cart_items', ['cart_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cart_items');
  },
};
