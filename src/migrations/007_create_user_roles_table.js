'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      expires_at: {
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

    await queryInterface.addIndex('user_roles', {
      fields: ['user_id', 'role_id', 'tenant_id', 'module_id'],
      unique: true,
      name: 'idx_user_roles_unique'
    });
    await queryInterface.addIndex('user_roles', {
      fields: ['user_id'],
      
      name: 'idx_user_roles_user_id'
    });
    await queryInterface.addIndex('user_roles', {
      fields: ['role_id'],
      
      name: 'idx_user_roles_role_id'
    });
    await queryInterface.addIndex('user_roles', {
      fields: ['tenant_id'],
      
      name: 'idx_user_roles_tenant_id'
    });
    await queryInterface.addIndex('user_roles', {
      fields: ['module_id'],
      
      name: 'idx_user_roles_module_id'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('user_roles', 'idx_user_roles_unique');
    await queryInterface.removeIndex('user_roles', 'idx_user_roles_user_id');
    await queryInterface.removeIndex('user_roles', 'idx_user_roles_role_id');
    await queryInterface.removeIndex('user_roles', 'idx_user_roles_tenant_id');
    await queryInterface.removeIndex('user_roles', 'idx_user_roles_module_id');

    await queryInterface.dropTable('user_roles');
  }
};

