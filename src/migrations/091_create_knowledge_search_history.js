'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('knowledge_search_history', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
          onDelete: 'SET NULL'
        }
      },
      query: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      collection_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'knowledge_collections',
          key: 'id',
          onDelete: 'SET NULL'
        }
      },
      document_ids: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      results: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      context: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      search_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'semantic',
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

    await queryInterface.addIndex('knowledge_search_history', ['tenant_id'], { name: 'idx_search_history_tenant' });
    await queryInterface.addIndex('knowledge_search_history', ['collection_id'], { name: 'idx_search_history_collection' });
    await queryInterface.addIndex('knowledge_search_history', ['created_at'], { name: 'idx_search_history_created' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('knowledge_search_history');
  }
};
