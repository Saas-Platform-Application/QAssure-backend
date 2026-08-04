'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('modules', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      module_id: {
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
      version: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      runtime_language: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      framework: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      base_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      health_endpoint: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      endpoints: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      kafka_topics: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      cpu_request: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cpu_limit: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      memory_request: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      memory_limit: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      min_replicas: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2,
      },
      max_replicas: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 10,
      },
      last_health_check: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      health_status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      consecutive_failures: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      registered_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.UUID,
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

    await queryInterface.addIndex('modules', {
      fields: ['module_id'],
      unique: true,
      name: 'idx_modules_module_id'
    });
    await queryInterface.addIndex('modules', {
      fields: ['status'],
      
      name: 'idx_modules_status'
    });
    await queryInterface.addIndex('modules', {
      fields: ['tenant_id'],
      
      name: 'idx_modules_tenant_id'
    });
    await queryInterface.addIndex('modules', {
      fields: ['registered_by'],
      
      name: 'idx_modules_registered_by'
    });
    await queryInterface.addIndex('modules', {
      fields: ['created_at'],
      
      name: 'idx_modules_created_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('modules', 'idx_modules_module_id');
    await queryInterface.removeIndex('modules', 'idx_modules_status');
    await queryInterface.removeIndex('modules', 'idx_modules_tenant_id');
    await queryInterface.removeIndex('modules', 'idx_modules_registered_by');
    await queryInterface.removeIndex('modules', 'idx_modules_created_at');

    await queryInterface.dropTable('modules');
  }
};

