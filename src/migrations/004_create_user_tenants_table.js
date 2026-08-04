'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_tenants', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('user_tenants', {
      fields: ['user_id', 'tenant_id'],
      unique: true,
      name: 'idx_user_tenants_user_tenant'
    });
    await queryInterface.addIndex('user_tenants', {
      fields: ['user_id'],
      
      name: 'idx_user_tenants_user_id'
    });
    await queryInterface.addIndex('user_tenants', {
      fields: ['tenant_id'],
      
      name: 'idx_user_tenants_tenant_id'
    });
    await queryInterface.addIndex('user_tenants', {
      fields: ['status'],
      
      name: 'idx_user_tenants_status'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('user_tenants', 'idx_user_tenants_user_tenant');
    await queryInterface.removeIndex('user_tenants', 'idx_user_tenants_user_id');
    await queryInterface.removeIndex('user_tenants', 'idx_user_tenants_tenant_id');
    await queryInterface.removeIndex('user_tenants', 'idx_user_tenants_status');

    await queryInterface.dropTable('user_tenants');
  }
};

