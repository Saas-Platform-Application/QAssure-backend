'use strict';

/**
 * Phase 26: Module SSO Launch System - Complete Migration
 * 
 * This migration ensures all components for Module SSO Launch are in place:
 * 1. Ensures tenant_module_access table exists (created in 026)
 * 2. Ensures module_launch_tokens table exists (created in 027)
 * 3. Ensures api_keys has module_id column (added in 040)
 * 4. Ensures api_keys has key_prefix column (added in 023)
 * 5. Creates module_user role if it doesn't exist
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    
    // ============================================================================
    // 1. Ensure tenant_module_access table exists (should already exist from 026)
    // ============================================================================
    const [tenantModuleAccessExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenant_module_access'
      );
    `);

    if (!tenantModuleAccessExists[0].exists) {
      console.log('⚠️  tenant_module_access table not found. Please run migration 026 first.');
    } else {
      console.log('✅ tenant_module_access table exists');
    }

    // ============================================================================
    // 2. Ensure module_launch_tokens table exists (should already exist from 027)
    // ============================================================================
    const [moduleLaunchTokensExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'module_launch_tokens'
      );
    `);

    if (!moduleLaunchTokensExists[0].exists) {
      console.log('⚠️  module_launch_tokens table not found. Please run migration 027 first.');
    } else {
      console.log('✅ module_launch_tokens table exists');
    }

    // ============================================================================
    // 3. Ensure api_keys has module_id column (should already exist from 040)
    // ============================================================================
    const [apiKeysModuleIdExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys' 
        AND column_name = 'module_id'
      );
    `);

    if (!apiKeysModuleIdExists[0].exists) {
      console.log('⚠️  api_keys.module_id column not found. Adding it...');
      await queryInterface.addColumn('api_keys', 'module_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });

      // Add index for module_id
      await queryInterface.addIndex('api_keys', ['module_id'], {
        name: 'idx_api_keys_module_id',
        unique: false,
      });
      console.log('✅ api_keys.module_id column added');
    } else {
      console.log('✅ api_keys.module_id column exists');
    }

    // ============================================================================
    // 4. Ensure api_keys has key_prefix column (should already exist from 023)
    // ============================================================================
    const [apiKeysPrefixExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys' 
        AND column_name = 'key_prefix'
      );
    `);

    if (!apiKeysPrefixExists[0].exists) {
      console.log('⚠️  api_keys.key_prefix column not found. Adding it...');
      await queryInterface.addColumn('api_keys', 'key_prefix', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
      console.log('✅ api_keys.key_prefix column added');
    } else {
      console.log('✅ api_keys.key_prefix column exists');
    }

    // ============================================================================
    // 5. Create module_user role if it doesn't exist
    // ============================================================================
    const [moduleUserRoleExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM roles 
        WHERE code = 'module_user'
      );
    `);

    if (!moduleUserRoleExists[0].exists) {
      console.log('Creating module_user role...');
      await sequelize.query(`
        INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          'Module User',
          'module_user',
          'Default role for module access - grants basic access to assigned modules',
          'TENANT',
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ module_user role created');
    } else {
      console.log('✅ module_user role already exists');
    }

    console.log('\n✅ Phase 26: Module SSO Launch System migration completed');
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // Remove module_user role
    await sequelize.query(`
      DELETE FROM roles WHERE code = 'module_user';
    `);
    console.log('✅ module_user role removed');

    // Note: We don't remove columns or tables in down() because:
    // - tenant_module_access is managed by migration 026
    // - module_launch_tokens is managed by migration 027
    // - api_keys.module_id is managed by migration 040
    // - api_keys.key_prefix is managed by migration 023
  }
};
