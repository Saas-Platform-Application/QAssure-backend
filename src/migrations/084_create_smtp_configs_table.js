'use strict';

/**
 * Migration 084: Create smtp_configs table for dynamic email configuration
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('notification_smtp_configs')) {
      await queryInterface.createTable('notification_smtp_configs', {
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
        scope: {
          type: Sequelize.ENUM('super_admin', 'tenant'),
          defaultValue: 'tenant',
          allowNull: false
        },
        provider: {
          type: Sequelize.STRING(50),
          defaultValue: 'smtp',
          allowNull: false
        },
        host: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        port: {
          type: Sequelize.INTEGER,
          defaultValue: 587,
          allowNull: false
        },
        secure: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },
        username: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        password: {
          type: Sequelize.TEXT, // Encrypted
          allowNull: false
        },
        from_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        from_email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
        },
        updated_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
      });

      // Indexes
      await queryInterface.addIndex('notification_smtp_configs', ['tenant_id'], { name: 'idx_smtp_configs_tenant' });
      await queryInterface.addIndex('notification_smtp_configs', ['scope'], { name: 'idx_smtp_configs_scope' });
      await queryInterface.addIndex('notification_smtp_configs', ['is_active'], { name: 'idx_smtp_configs_active' });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notification_smtp_configs');
    // Drop enum type manually if needed (Postgres specific)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notification_smtp_configs_scope";');
  }
};
