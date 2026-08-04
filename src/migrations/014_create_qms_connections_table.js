'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qms_connections', {
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
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qms_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      base_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      auth_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      auth_config: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      sync_mode: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'BIDIRECTIONAL',
      },
      entity_mappings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      field_mappings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      webhook_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_secret: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
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

    await queryInterface.addIndex('qms_connections', {
      fields: ['tenant_id'],
      
      name: 'idx_qms_connections_tenant_id'
    });
    await queryInterface.addIndex('qms_connections', {
      fields: ['qms_type'],
      
      name: 'idx_qms_connections_qms_type'
    });
    await queryInterface.addIndex('qms_connections', {
      fields: ['status'],
      
      name: 'idx_qms_connections_status'
    });
    await queryInterface.addIndex('qms_connections', {
      fields: ['created_by'],
      
      name: 'idx_qms_connections_created_by'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('qms_connections', 'idx_qms_connections_tenant_id');
    await queryInterface.removeIndex('qms_connections', 'idx_qms_connections_qms_type');
    await queryInterface.removeIndex('qms_connections', 'idx_qms_connections_status');
    await queryInterface.removeIndex('qms_connections', 'idx_qms_connections_created_by');

    await queryInterface.dropTable('qms_connections');
  }
};

