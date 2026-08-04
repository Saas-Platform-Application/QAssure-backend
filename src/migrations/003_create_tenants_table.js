'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      subscription_tier: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      max_users: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_modules: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex('tenants', {
      fields: ['name'],
      unique: true,
      name: 'idx_tenants_name'
    });
    await queryInterface.addIndex('tenants', {
      fields: ['slug'],
      unique: true,
      name: 'idx_tenants_slug'
    });
    await queryInterface.addIndex('tenants', {
      fields: ['status'],
      
      name: 'idx_tenants_status'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('tenants', 'idx_tenants_name');
    await queryInterface.removeIndex('tenants', 'idx_tenants_slug');
    await queryInterface.removeIndex('tenants', 'idx_tenants_status');

    await queryInterface.dropTable('tenants');
  }
};

