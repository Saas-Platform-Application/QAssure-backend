'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add embedding config columns to tenant_ai_configs
    // Enables tenants to configure custom embedding models for RAG
    await queryInterface.addColumn('tenant_ai_configs', 'custom_embedding_models', {
      type: Sequelize.JSONB,
      defaultValue: [],
      allowNull: true,
      comment: 'List of custom embedding models supported by this configuration'
    });

    await queryInterface.addColumn('tenant_ai_configs', 'default_embedding_model', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'The primary embedding model to use for this tenant'
    });

    // 2. Add embedding tracking to knowledge_collections
    // Stores parameters used during document vectorization
    await queryInterface.addColumn('knowledge_collections', 'embedding_model', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'The model used to vectorize docs in this collection'
    });

    await queryInterface.addColumn('knowledge_collections', 'embedding_dimension', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Dimension size of vectors (e.g., 1024, 1536)'
    });

    await queryInterface.addColumn('knowledge_collections', 'embedding_provider', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'The provider (openai, local, azure) used for embeddings'
    });

    // 3. Remove restrictive CHECK constraint on provider name (if exists)
    // Provider can now be any string (custom models like pharma-gpt, mistral, etc.)
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs DROP CONSTRAINT IF EXISTS chk_provider;
    `);

    console.log('Migration 089: AI Embedding Model Configuration applied');
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove columns from tenant_ai_configs
    await queryInterface.removeColumn('tenant_ai_configs', 'custom_embedding_models');
    await queryInterface.removeColumn('tenant_ai_configs', 'default_embedding_model');

    // 2. Remove columns from knowledge_collections
    await queryInterface.removeColumn('knowledge_collections', 'embedding_model');
    await queryInterface.removeColumn('knowledge_collections', 'embedding_dimension');
    await queryInterface.removeColumn('knowledge_collections', 'embedding_provider');

    // 3. Restore provider constraint (allowing base providers)
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs DROP CONSTRAINT IF EXISTS chk_provider;
      ALTER TABLE tenant_ai_configs ADD CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic', 'open-source'));
    `);

    console.log('Migration 089: AI Embedding Model Configuration reverted');
  }
};
