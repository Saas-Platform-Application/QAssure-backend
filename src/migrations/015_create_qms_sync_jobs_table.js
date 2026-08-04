'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qms_sync_jobs', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      connection_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      job_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      direction: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      records_total: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      records_processed: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      records_created: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      records_updated: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      records_failed: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      conflicts_detected: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      conflicts_resolved: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      triggered_by: {
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

    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['connection_id'],
      
      name: 'idx_qms_sync_jobs_connection_id'
    });
    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['status'],
      
      name: 'idx_qms_sync_jobs_status'
    });
    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['job_type'],
      
      name: 'idx_qms_sync_jobs_job_type'
    });
    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['entity_type'],
      
      name: 'idx_qms_sync_jobs_entity_type'
    });
    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['started_at'],
      
      name: 'idx_qms_sync_jobs_started_at'
    });
    await queryInterface.addIndex('qms_sync_jobs', {
      fields: ['created_at'],
      
      name: 'idx_qms_sync_jobs_created_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_connection_id');
    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_status');
    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_job_type');
    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_entity_type');
    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_started_at');
    await queryInterface.removeIndex('qms_sync_jobs', 'idx_qms_sync_jobs_created_at');

    await queryInterface.dropTable('qms_sync_jobs');
  }
};

