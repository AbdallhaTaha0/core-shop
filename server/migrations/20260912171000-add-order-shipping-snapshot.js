'use strict';

/**
 * Adds a nullable shipping snapshot to `orders`. Like order items, the
 * address is frozen at purchase time: later edits to the user's address
 * book never rewrite where an order was sent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'ship_full_name', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'ship_line1', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'ship_line2', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'ship_city', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'ship_postal_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'ship_country', {
      type: Sequelize.CHAR(2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'ship_country');
    await queryInterface.removeColumn('orders', 'ship_postal_code');
    await queryInterface.removeColumn('orders', 'ship_city');
    await queryInterface.removeColumn('orders', 'ship_line2');
    await queryInterface.removeColumn('orders', 'ship_line1');
    await queryInterface.removeColumn('orders', 'ship_full_name');
  },
};
