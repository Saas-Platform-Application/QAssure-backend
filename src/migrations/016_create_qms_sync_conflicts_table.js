'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qms_sync_conflicts', {
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
      sync_job_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      qms_connection_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qms_record_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qassure_record_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      conflict_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      conflict_field: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      qms_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      qassure_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      conflict_details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      resolution_strategy: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resolved_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      resolved_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      last_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['tenant_id'],
      
      name: 'idx_qms_sync_conflicts_tenant'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['sync_job_id'],
      
      name: 'idx_qms_sync_conflicts_job'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['qms_connection_id'],
      
      name: 'idx_qms_sync_conflicts_conn'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['status'],
      
      name: 'idx_qms_sync_conflicts_status'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['entity_type', 'entity_id'],
      
      name: 'idx_qms_sync_conflicts_entity'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['created_at'],
      
      name: 'idx_qms_sync_conflicts_created'
    });
    await queryInterface.addIndex('qms_sync_conflicts', {
      fields: ['tenant_id', 'status', 'created_at'],
      
      name: 'idx_qms_sync_conflicts_tenant_status'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_tenant');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_job');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_conn');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_status');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_entity');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_created');
    await queryInterface.removeIndex('qms_sync_conflicts', 'idx_qms_sync_conflicts_tenant_status');

    await queryInterface.dropTable('qms_sync_conflicts');
  }
};

