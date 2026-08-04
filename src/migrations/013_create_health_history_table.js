'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('health_history', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      http_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      components: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      checked_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      timestamps: true,
      underscored: true
    });

    await queryInterface.addIndex('health_history', {
      fields: ['module_id'],
      
      name: 'idx_health_history_module_id'
    });
    await queryInterface.addIndex('health_history', {
      fields: ['status'],
      
      name: 'idx_health_history_status'
    });
    await queryInterface.addIndex('health_history', {
      fields: ['checked_at'],
      
      name: 'idx_health_history_checked_at'
    });
    await queryInterface.addIndex('health_history', {
      fields: ['created_at'],
      
      name: 'idx_health_history_created_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('health_history', 'idx_health_history_module_id');
    await queryInterface.removeIndex('health_history', 'idx_health_history_status');
    await queryInterface.removeIndex('health_history', 'idx_health_history_checked_at');
    await queryInterface.removeIndex('health_history', 'idx_health_history_created_at');

    await queryInterface.dropTable('health_history');
  }
};

