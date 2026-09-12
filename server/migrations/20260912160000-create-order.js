'use strict';

/** Creates `orders`. Totals are integer minor units with CHECK floors. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      currency: {
        type: Sequelize.CHAR(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      subtotal_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      payment_id: {
        type: Sequelize.STRING(120),
        allowNull: true,
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

    await queryInterface.addConstraint('orders', {
      fields: ['subtotal_cents'],
      type: 'check',
      name: 'orders_subtotal_non_negative',
      where: { subtotal_cents: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('orders', {
      fields: ['total_cents'],
      type: 'check',
      name: 'orders_total_non_negative',
      where: { total_cents: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addIndex('orders', ['user_id', 'created_at']);
    await queryInterface.addIndex('orders', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
  },
};
