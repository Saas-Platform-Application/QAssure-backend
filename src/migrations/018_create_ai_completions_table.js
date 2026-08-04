'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_completions', {
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
        allowNull: false,
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      prompt_template_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      prompt: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      system_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      temperature: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      max_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      top_p: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      frequency_penalty: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      presence_penalty: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      stop_sequences: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      cached: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      cache_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      streaming: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      prompt_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completion_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      total_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cost_usd: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fallback_provider: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      correlation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('ai_completions', {
      fields: ['tenant_id'],
      
      name: 'idx_ai_completions_tenant'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['module_id'],
      
      name: 'idx_ai_completions_module'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['user_id'],
      
      name: 'idx_ai_completions_user'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['use_case'],
      
      name: 'idx_ai_completions_use_case'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['provider'],
      
      name: 'idx_ai_completions_provider'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['status'],
      
      name: 'idx_ai_completions_status'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['cached'],
      
      name: 'idx_ai_completions_cached'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['cache_key'],
      
      name: 'idx_ai_completions_cache_key'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['created_at'],
      
      name: 'idx_ai_completions_created'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['tenant_id', 'created_at'],
      
      name: 'idx_ai_completions_tenant_created'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['tenant_id', 'use_case', 'created_at'],
      
      name: 'idx_ai_completions_tenant_use_case'
    });
    await queryInterface.addIndex('ai_completions', {
      fields: ['correlation_id'],
      
      name: 'idx_ai_completions_correlation'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_tenant');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_module');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_user');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_use_case');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_provider');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_status');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_cached');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_cache_key');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_created');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_tenant_created');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_tenant_use_case');
    await queryInterface.removeIndex('ai_completions', 'idx_ai_completions_correlation');

    await queryInterface.dropTable('ai_completions');
  }
};

