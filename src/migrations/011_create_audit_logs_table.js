'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resource_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      correlation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
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

    await queryInterface.addIndex('audit_logs', {
      fields: ['tenant_id'],
      
      name: 'idx_audit_logs_tenant_id'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['user_id'],
      
      name: 'idx_audit_logs_user_id'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['action'],
      
      name: 'idx_audit_logs_action'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['resource_type'],
      
      name: 'idx_audit_logs_resource_type'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['resource_id'],
      
      name: 'idx_audit_logs_resource_id'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['correlation_id'],
      
      name: 'idx_audit_logs_correlation_id'
    });
    await queryInterface.addIndex('audit_logs', {
      fields: ['created_at'],
      
      name: 'idx_audit_logs_created_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_tenant_id');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_user_id');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_action');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_resource_type');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_resource_id');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_correlation_id');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_created_at');

    await queryInterface.dropTable('audit_logs');
  }
};

