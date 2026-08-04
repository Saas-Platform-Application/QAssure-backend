'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenant_module_access', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enabled_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      enabled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      disabled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      disabled_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Tenant-specific module configuration'
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

    // Unique constraint: one entry per tenant-module pair
    await queryInterface.addIndex('tenant_module_access', {
      fields: ['tenant_id', 'module_id'],
      unique: true,
      name: 'idx_tenant_module_access_unique'
    });

    await queryInterface.addIndex('tenant_module_access', {
      fields: ['tenant_id'],
      name: 'idx_tenant_module_access_tenant_id'
    });

    await queryInterface.addIndex('tenant_module_access', {
      fields: ['module_id'],
      name: 'idx_tenant_module_access_module_id'
    });

    await queryInterface.addIndex('tenant_module_access', {
      fields: ['enabled'],
      name: 'idx_tenant_module_access_enabled'
    });

    await queryInterface.addIndex('tenant_module_access', {
      fields: ['tenant_id', 'enabled'],
      name: 'idx_tenant_module_access_tenant_enabled'
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('tenant_module_access', 'idx_tenant_module_access_unique');
    await queryInterface.removeIndex('tenant_module_access', 'idx_tenant_module_access_tenant_id');
    await queryInterface.removeIndex('tenant_module_access', 'idx_tenant_module_access_module_id');
    await queryInterface.removeIndex('tenant_module_access', 'idx_tenant_module_access_enabled');
    await queryInterface.removeIndex('tenant_module_access', 'idx_tenant_module_access_tenant_enabled');

    await queryInterface.dropTable('tenant_module_access');
  }
};
