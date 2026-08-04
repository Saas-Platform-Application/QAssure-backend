'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('event_logs', {
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
      event_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      event_source: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      event_subject: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      event_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      spec_version: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 1.0,
      },
      data_content_type: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'application/json',
      },
      data_schema: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      correlation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      causation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      kafka_topic: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kafka_partition: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      kafka_offset: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      kafka_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      producer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consumer_group: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      processing_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PUBLISHED',
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('event_logs', {
      fields: ['tenant_id'],
      
      name: 'idx_event_logs_tenant'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['event_id'],
      unique: true,
      name: 'idx_event_logs_event_id'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['event_type'],
      
      name: 'idx_event_logs_event_type'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['event_source'],
      
      name: 'idx_event_logs_event_source'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['event_time'],
      
      name: 'idx_event_logs_event_time'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['kafka_topic'],
      
      name: 'idx_event_logs_kafka_topic'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['correlation_id'],
      
      name: 'idx_event_logs_correlation'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['causation_id'],
      
      name: 'idx_event_logs_causation'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['processing_status'],
      
      name: 'idx_event_logs_status'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['published_at'],
      
      name: 'idx_event_logs_published'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['tenant_id', 'event_type', 'event_time'],
      
      name: 'idx_event_logs_tenant_type_time'
    });
    await queryInterface.addIndex('event_logs', {
      fields: ['kafka_topic', 'kafka_partition', 'kafka_offset'],
      
      name: 'idx_event_logs_kafka_position'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('event_logs', 'idx_event_logs_tenant');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_event_id');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_event_type');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_event_source');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_event_time');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_kafka_topic');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_correlation');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_causation');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_status');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_published');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_tenant_type_time');
    await queryInterface.removeIndex('event_logs', 'idx_event_logs_kafka_position');

    await queryInterface.dropTable('event_logs');
  }
};

