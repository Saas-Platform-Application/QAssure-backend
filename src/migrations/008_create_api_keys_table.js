'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      key_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      rate_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1000,
      },
      ip_allowlist: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_used_ip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('api_keys', {
      fields: ['key_hash'],
      unique: true,
      name: 'idx_api_keys_key_hash'
    });
    await queryInterface.addIndex('api_keys', {
      fields: ['tenant_id'],
      
      name: 'idx_api_keys_tenant_id'
    });
    await queryInterface.addIndex('api_keys', {
      fields: ['created_by'],
      
      name: 'idx_api_keys_created_by'
    });
    await queryInterface.addIndex('api_keys', {
      fields: ['status'],
      
      name: 'idx_api_keys_status'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('api_keys', 'idx_api_keys_key_hash');
    await queryInterface.removeIndex('api_keys', 'idx_api_keys_tenant_id');
    await queryInterface.removeIndex('api_keys', 'idx_api_keys_created_by');
    await queryInterface.removeIndex('api_keys', 'idx_api_keys_status');

    await queryInterface.dropTable('api_keys');
  }
};

