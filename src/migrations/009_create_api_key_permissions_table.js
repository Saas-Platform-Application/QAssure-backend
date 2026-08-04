'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_key_permissions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      api_key_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      scope: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'TENANT',
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

    await queryInterface.addIndex('api_key_permissions', {
      fields: ['api_key_id'],
      
      name: 'idx_api_key_permissions_api_key_id'
    });
    await queryInterface.addIndex('api_key_permissions', {
      fields: ['resource', 'action'],
      
      name: 'idx_api_key_permissions_resource_action'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('api_key_permissions', 'idx_api_key_permissions_api_key_id');
    await queryInterface.removeIndex('api_key_permissions', 'idx_api_key_permissions_resource_action');

    await queryInterface.dropTable('api_key_permissions');
  }
};

