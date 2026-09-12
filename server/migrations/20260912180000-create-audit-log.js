'use strict';

/** Creates append-only `audit_logs`. Actor references survive user deletion (SET NULL). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    await queryInterface.addIndex('audit_logs', ['actor_user_id']);
    await queryInterface.addIndex('audit_logs', ['action', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
