'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      scope: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'TENANT',
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: true,
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

    await queryInterface.addIndex('permissions', {
      fields: ['role_id'],
      
      name: 'idx_permissions_role_id'
    });
    await queryInterface.addIndex('permissions', {
      fields: ['resource', 'action'],
      
      name: 'idx_permissions_resource_action'
    });
    await queryInterface.addIndex('permissions', {
      fields: ['scope'],
      
      name: 'idx_permissions_scope'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('permissions', 'idx_permissions_role_id');
    await queryInterface.removeIndex('permissions', 'idx_permissions_resource_action');
    await queryInterface.removeIndex('permissions', 'idx_permissions_scope');

    await queryInterface.dropTable('permissions');
  }
};

