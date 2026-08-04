'use strict';

/**
 * Migration 087: Create failed_emails table and add test status to smtp_configs
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    
    // 1. Create failed_emails table
    if (!tables.includes('failed_emails')) {
      await queryInterface.createTable('failed_emails', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        tenant_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'tenants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        notification_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'notifications', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        to_email: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        subject: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        body: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'failed',
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });

      await queryInterface.addIndex('failed_emails', ['tenant_id'], { name: 'idx_failed_emails_tenant' });
      await queryInterface.addIndex('failed_emails', ['status'], { name: 'idx_failed_emails_status' });
    }

    // 2. Add last_tested_at and last_test_status to notification_smtp_configs
    const tableDesc = await queryInterface.describeTable('notification_smtp_configs');
    if (!tableDesc.last_tested_at) {
      await queryInterface.addColumn('notification_smtp_configs', 'last_tested_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!tableDesc.last_test_status) {
      await queryInterface.addColumn('notification_smtp_configs', 'last_test_status', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('notification_smtp_configs');
    if (tableDesc.last_tested_at) {
      await queryInterface.removeColumn('notification_smtp_configs', 'last_tested_at');
    }
    if (tableDesc.last_test_status) {
      await queryInterface.removeColumn('notification_smtp_configs', 'last_test_status');
    }
    
    await queryInterface.dropTable('failed_emails');
  }
};
