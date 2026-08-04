'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('module_launch_tokens', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        unique: true,
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA256 hash of the launch token'
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_email: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Snapshot of user email at launch time'
      },
      user_first_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Snapshot of user first name at launch time'
      },
      user_last_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Snapshot of user last name at launch time'
      },
      is_super_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether user is LTTS Super Admin'
      },
      is_tenant_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether user is Tenant Admin'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the user who requested the launch'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent string'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Token expiration time (typically 60 seconds from creation)'
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the token was verified/used (NULL if not yet used)'
      },
      used_by_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address that verified/used the token'
      },
      verification_module_api_key_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'API Key ID used by module to verify the token'
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

    // Index for fast token lookup
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['token_hash'],
      unique: true,
      name: 'idx_module_launch_tokens_hash'
    });

    // Index for finding tokens by user
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['user_id'],
      name: 'idx_module_launch_tokens_user_id'
    });

    // Index for finding tokens by module
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['module_id'],
      name: 'idx_module_launch_tokens_module_id'
    });

    // Index for finding tokens by tenant
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['tenant_id'],
      name: 'idx_module_launch_tokens_tenant_id'
    });

    // Index for cleanup job (expired tokens)
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['expires_at'],
      name: 'idx_module_launch_tokens_expires_at'
    });

    // Index for finding unused tokens
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['used_at'],
      name: 'idx_module_launch_tokens_used_at'
    });

    // Composite index for verification query
    await queryInterface.addIndex('module_launch_tokens', {
      fields: ['token_hash', 'module_id', 'used_at'],
      name: 'idx_module_launch_tokens_verify'
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_hash');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_user_id');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_module_id');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_tenant_id');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_expires_at');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_used_at');
    await queryInterface.removeIndex('module_launch_tokens', 'idx_module_launch_tokens_verify');

    await queryInterface.dropTable('module_launch_tokens');
  }
};
