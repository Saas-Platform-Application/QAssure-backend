'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
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
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scope: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'TENANT',
      },
      is_system: {
        type: Sequelize.BOOLEAN,
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

    await queryInterface.addIndex('roles', {
      fields: ['name'],
      unique: true,
      name: 'idx_roles_name'
    });
    await queryInterface.addIndex('roles', {
      fields: ['code'],
      unique: true,
      name: 'idx_roles_code'
    });
    await queryInterface.addIndex('roles', {
      fields: ['scope'],
      
      name: 'idx_roles_scope'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('roles', 'idx_roles_name');
    await queryInterface.removeIndex('roles', 'idx_roles_code');
    await queryInterface.removeIndex('roles', 'idx_roles_scope');

    await queryInterface.dropTable('roles');
  }
};

