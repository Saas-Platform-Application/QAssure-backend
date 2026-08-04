'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qms_entity_mappings', {
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
      qms_connection_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      qms_entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qassure_entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mapping_direction: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'BIDIRECTIONAL',
      },
      field_mappings: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      transformation_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      validation_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      conflict_resolution_strategy: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MANUAL',
      },
      sync_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sync_frequency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      filter_criteria: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      records_synced: {
        type: Sequelize.BIGINT,
        allowNull: false,
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

    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['tenant_id'],
      
      name: 'idx_qms_entity_mappings_tenant'
    });
    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['qms_connection_id'],
      
      name: 'idx_qms_entity_mappings_conn'
    });
    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['qms_entity_type'],
      
      name: 'idx_qms_entity_mappings_qms_type'
    });
    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['qassure_entity_type'],
      
      name: 'idx_qms_entity_mappings_qassure_type'
    });
    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['qms_connection_id', 'qms_entity_type'],
      unique: true,
      name: 'idx_qms_entity_mappings_conn_type'
    });
    await queryInterface.addIndex('qms_entity_mappings', {
      fields: ['sync_enabled'],
      
      name: 'idx_qms_entity_mappings_enabled'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_tenant');
    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_conn');
    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_qms_type');
    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_qassure_type');
    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_conn_type');
    await queryInterface.removeIndex('qms_entity_mappings', 'idx_qms_entity_mappings_enabled');

    await queryInterface.dropTable('qms_entity_mappings');
  }
};

