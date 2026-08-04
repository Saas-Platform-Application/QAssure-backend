'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_prompt_templates', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      use_case: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      template: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      system_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      variables: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      default_parameters: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      recommended_models: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      usage_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      avg_cost_usd: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      avg_latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      success_rate: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updated_by: {
        type: Sequelize.UUID,
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

    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['tenant_id'],
      
      name: 'idx_ai_prompt_templates_tenant'
    });
    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['name'],
      
      name: 'idx_ai_prompt_templates_name'
    });
    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['use_case'],
      
      name: 'idx_ai_prompt_templates_use_case'
    });
    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['status'],
      
      name: 'idx_ai_prompt_templates_status'
    });
    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['is_default'],
      
      name: 'idx_ai_prompt_templates_default'
    });
    await queryInterface.addIndex('ai_prompt_templates', {
      fields: ['tenant_id', 'name', 'version'],
      unique: true,
      name: 'idx_ai_prompt_templates_unique_version'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_tenant');
    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_name');
    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_use_case');
    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_status');
    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_default');
    await queryInterface.removeIndex('ai_prompt_templates', 'idx_ai_prompt_templates_unique_version');

    await queryInterface.dropTable('ai_prompt_templates');
  }
};

