'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Drop the old table if it exists from previous wrong implementation
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "resource_types" CASCADE');

    // 2. Create the new table with the requested name
    await queryInterface.createTable('audit_log_resource_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM('PLATFORM', 'MODULE'),
        defaultValue: 'PLATFORM',
        allowNull: false
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      audit_log_tracking: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 3. Ensure module_id exists in audit_logs (it should be there if 080 ran, but let's be safe)
    const tableInfo = await queryInterface.describeTable('audit_logs');
    if (!tableInfo.module_id) {
      await queryInterface.addColumn('audit_logs', 'module_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('audit_logs', ['module_id'], {
        name: 'idx_audit_logs_module_id'
      });
    }

    // 4. Seed with correct resource types
    const resourceTypes = [
      'session', 'user', 'tenant', 'role', 'permission', 'user_role', 'user_tenant',
      'api_key', 'module', 'audit_log', 'event_log', 'document', 'capa', 'training',
      'supplier', 'workflow', 'project', 'notification', 'file_attachment',
      'electronic_signature', 'security_policy', 'report', 'billing', 'license',
      'webhook', 'department', 'designation', 'user_category', 'system_config',
      'dashboard', 'health_check', 'qms_connection', 'ai_completion', 'knowledge'
    ];

    const seedData = resourceTypes.map(name => ({
      id: Sequelize.literal('gen_random_uuid()'),
      name: name,
      type: 'PLATFORM',
      audit_log_tracking: true,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('audit_log_resource_types', seedData);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_log_resource_types');
    // We don't drop the audit_logs.module_id column as it's useful regardless
  }
};
