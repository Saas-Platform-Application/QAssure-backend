'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      auth_provider: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'local',
      },
      saml_subject: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      oauth_provider: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      oauth_subject: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      login_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      last_login_ip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      preferences: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex('users', {
      fields: ['email'],
      unique: true,
      name: 'idx_users_email'
    });
    await queryInterface.addIndex('users', {
      fields: ['saml_subject'],
      unique: true,
      name: 'idx_users_saml_subject'
    });
    await queryInterface.addIndex('users', {
      fields: ['status'],
      
      name: 'idx_users_status'
    });
    await queryInterface.addIndex('users', {
      fields: ['created_at'],
      
      name: 'idx_users_created_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('users', 'idx_users_email');
    await queryInterface.removeIndex('users', 'idx_users_saml_subject');
    await queryInterface.removeIndex('users', 'idx_users_status');
    await queryInterface.removeIndex('users', 'idx_users_created_at');

    await queryInterface.dropTable('users');
  }
};

