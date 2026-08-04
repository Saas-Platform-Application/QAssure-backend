'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Event Subscriptions Table
    await queryInterface.createTable('event_subscriptions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      module_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      subscriber_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      event_pattern: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      delivery_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'kafka',
      },
      callback_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      kafka_topic: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      filters: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
          onDelete: 'SET NULL'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addIndex('event_subscriptions', ['tenant_id'], { name: 'idx_event_sub_tenant' });
    await queryInterface.addIndex('event_subscriptions', ['module_code'], { name: 'idx_event_sub_module' });
    await queryInterface.addIndex('event_subscriptions', ['event_pattern'], { name: 'idx_event_sub_pattern' });
    await queryInterface.addIndex('event_subscriptions', ['status'], { name: 'idx_event_sub_status' });

    // Webhooks Table
    await queryInterface.createTable('webhooks', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      secret: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      auth_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'none',
      },
      auth_config: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      events: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'POST',
      },
      headers: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      timeout_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 30000,
      },
      retry_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      max_retries: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 3,
      },
      retry_delay_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1000,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      last_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      success_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      failure_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
          onDelete: 'SET NULL'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addIndex('webhooks', ['tenant_id'], { name: 'idx_webhook_tenant' });
    await queryInterface.addIndex('webhooks', ['status'], { name: 'idx_webhook_status' });
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_webhook_events ON webhooks USING GIN(events)
    `);

    // Webhook Deliveries Table
    await queryInterface.createTable('webhook_deliveries', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      webhook_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'webhooks',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      event_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      event_type: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 3,
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      next_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addIndex('webhook_deliveries', ['webhook_id'], { name: 'idx_delivery_webhook' });
    await queryInterface.addIndex('webhook_deliveries', ['tenant_id'], { name: 'idx_delivery_tenant' });
    await queryInterface.addIndex('webhook_deliveries', ['status'], { name: 'idx_delivery_status' });
    await queryInterface.addIndex('webhook_deliveries', ['event_type'], { name: 'idx_delivery_event_type' });
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_delivery_next_retry ON webhook_deliveries(next_retry_at) 
      WHERE status = 'pending'
    `);

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE event_subscriptions IS 'Module subscriptions to event types for cross-module communication';
      COMMENT ON TABLE webhooks IS 'External webhook endpoints for event delivery';
      COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and status tracking';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhook_deliveries');
    await queryInterface.dropTable('webhooks');
    await queryInterface.dropTable('event_subscriptions');
  }
};

