'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Knowledge Collections Table
    await queryInterface.createTable('knowledge_collections', {
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
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      document_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      chunk_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'active',
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

    await queryInterface.addIndex('knowledge_collections', ['tenant_id'], { name: 'idx_knowledge_collections_tenant' });
    await queryInterface.addIndex('knowledge_collections', ['tenant_id', 'status'], { name: 'idx_knowledge_collections_status' });

    // Knowledge Documents Table
    await queryInterface.createTable('knowledge_documents', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      collection_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'knowledge_collections',
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
      file_name: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      word_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      chunk_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'pending',
      },
      error_message: {
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
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('knowledge_documents', ['collection_id'], { name: 'idx_knowledge_documents_collection' });
    await queryInterface.addIndex('knowledge_documents', ['tenant_id'], { name: 'idx_knowledge_documents_tenant' });
    await queryInterface.addIndex('knowledge_documents', ['collection_id', 'status'], { name: 'idx_knowledge_documents_status' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('knowledge_documents');
    await queryInterface.dropTable('knowledge_collections');
  }
};

