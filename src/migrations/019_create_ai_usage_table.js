'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_usage', {
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
      module_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      use_case: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      period_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      request_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      success_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      failure_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      cached_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      total_prompt_tokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      total_completion_tokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      total_tokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      total_cost_usd: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      avg_latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      p50_latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      p95_latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      p99_latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cache_hit_rate: {
        type: Sequelize.DECIMAL,
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

    await queryInterface.addIndex('ai_usage', {
      fields: ['tenant_id'],
      
      name: 'idx_ai_usage_tenant'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['module_id'],
      
      name: 'idx_ai_usage_module'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['user_id'],
      
      name: 'idx_ai_usage_user'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['provider'],
      
      name: 'idx_ai_usage_provider'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['model'],
      
      name: 'idx_ai_usage_model'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['period_start'],
      
      name: 'idx_ai_usage_period_start'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['period_end'],
      
      name: 'idx_ai_usage_period_end'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['period_type'],
      
      name: 'idx_ai_usage_period_type'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['tenant_id', 'period_start', 'period_end'],
      
      name: 'idx_ai_usage_tenant_period'
    });
    await queryInterface.addIndex('ai_usage', {
      fields: ['tenant_id', 'provider', 'model', 'period_start'],
      unique: true,
      name: 'idx_ai_usage_unique_period'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_tenant');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_module');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_user');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_provider');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_model');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_period_start');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_period_end');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_period_type');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_tenant_period');
    await queryInterface.removeIndex('ai_usage', 'idx_ai_usage_unique_period');

    await queryInterface.dropTable('ai_usage');
  }
};

