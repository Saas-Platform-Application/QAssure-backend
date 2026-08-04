'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Prompt Versions Table
    await queryInterface.createTable('ai_prompt_versions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      prompt_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ai_prompt_templates',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
        defaultValue: [],
      },
      default_parameters: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      change_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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
      }
    });

    await queryInterface.addIndex('ai_prompt_versions', ['prompt_id'], { name: 'idx_prompt_versions_prompt' });
    await queryInterface.addIndex('ai_prompt_versions', ['prompt_id', 'version'], { name: 'idx_prompt_versions_version' });

    // Prompt Test Cases Table
    await queryInterface.createTable('ai_prompt_test_cases', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      prompt_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ai_prompt_templates',
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      input_variables: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      expected_output: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
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

    await queryInterface.addIndex('ai_prompt_test_cases', ['prompt_id'], { name: 'idx_prompt_test_cases_prompt' });
    await queryInterface.addIndex('ai_prompt_test_cases', ['tenant_id'], { name: 'idx_prompt_test_cases_tenant' });

    // Prompt Test Results Table
    await queryInterface.createTable('ai_prompt_test_results', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      test_case_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ai_prompt_test_cases',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      prompt_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      provider: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      input_variables: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      output: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cost_usd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
      },
      latency_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      passed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      run_by: {
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
      }
    });

    await queryInterface.addIndex('ai_prompt_test_results', ['test_case_id'], { name: 'idx_prompt_test_results_case' });
    await queryInterface.addIndex('ai_prompt_test_results', ['prompt_version'], { name: 'idx_prompt_test_results_version' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ai_prompt_test_results');
    await queryInterface.dropTable('ai_prompt_test_cases');
    await queryInterface.dropTable('ai_prompt_versions');
  }
};

