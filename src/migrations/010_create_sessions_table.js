'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
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
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      token_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      refresh_token_hash: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      refresh_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
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

    await queryInterface.addIndex('sessions', {
      fields: ['token_hash'],
      unique: true,
      name: 'idx_sessions_token_hash'
    });
    await queryInterface.addIndex('sessions', {
      fields: ['refresh_token_hash'],
      unique: true,
      name: 'idx_sessions_refresh_token_hash'
    });
    await queryInterface.addIndex('sessions', {
      fields: ['user_id'],
      
      name: 'idx_sessions_user_id'
    });
    await queryInterface.addIndex('sessions', {
      fields: ['tenant_id'],
      
      name: 'idx_sessions_tenant_id'
    });
    await queryInterface.addIndex('sessions', {
      fields: ['expires_at'],
      
      name: 'idx_sessions_expires_at'
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex('sessions', 'idx_sessions_token_hash');
    await queryInterface.removeIndex('sessions', 'idx_sessions_refresh_token_hash');
    await queryInterface.removeIndex('sessions', 'idx_sessions_user_id');
    await queryInterface.removeIndex('sessions', 'idx_sessions_tenant_id');
    await queryInterface.removeIndex('sessions', 'idx_sessions_expires_at');

    await queryInterface.dropTable('sessions');
  }
};

