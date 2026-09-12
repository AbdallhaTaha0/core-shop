'use strict';

/** Creates `addresses`. Rows die with their user (CASCADE). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      label: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      full_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      line1: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      line2: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      country: {
        type: Sequelize.CHAR(2),
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex('addresses', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  },
};
