'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create tenant_modules junction table for many-to-many relationship
    await queryInterface.createTable('tenant_modules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active'
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
    });

    // Add foreign key constraints (with error handling for idempotency)
    try {
      await queryInterface.addConstraint('tenant_modules', {
        fields: ['tenant_id'],
        type: 'foreign key',
        name: 'fk_tenant_modules_tenant_id',
        references: {
          table: 'tenants',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addConstraint('tenant_modules', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_tenant_modules_module_id',
        references: {
          table: 'modules',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addConstraint('tenant_modules', {
        fields: ['assigned_by'],
        type: 'foreign key',
        name: 'fk_tenant_modules_assigned_by',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    // Create unique constraint to prevent duplicate assignments
    try {
      await queryInterface.addConstraint('tenant_modules', {
        fields: ['tenant_id', 'module_id'],
        type: 'unique',
        name: 'unique_tenant_module'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    // Create indexes for better query performance
    try {
      await queryInterface.addIndex('tenant_modules', ['tenant_id'], {
        name: 'idx_tenant_modules_tenant_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addIndex('tenant_modules', ['module_id'], {
        name: 'idx_tenant_modules_module_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addIndex('tenant_modules', ['status'], {
        name: 'idx_tenant_modules_status'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('tenant_modules', 'idx_tenant_modules_status');
    await queryInterface.removeIndex('tenant_modules', 'idx_tenant_modules_module_id');
    await queryInterface.removeIndex('tenant_modules', 'idx_tenant_modules_tenant_id');
    
    // Remove foreign key constraints
    await queryInterface.removeConstraint('tenant_modules', 'fk_tenant_modules_assigned_by');
    await queryInterface.removeConstraint('tenant_modules', 'fk_tenant_modules_module_id');
    await queryInterface.removeConstraint('tenant_modules', 'fk_tenant_modules_tenant_id');
    
    // Remove unique constraint
    await queryInterface.removeConstraint('tenant_modules', 'unique_tenant_module');
    
    // Drop table
    await queryInterface.dropTable('tenant_modules');
  }
};
