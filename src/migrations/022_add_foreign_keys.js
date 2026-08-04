'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addConstraint('modules', {
      fields: ['registered_by'],
      type: 'foreign key',
      name: 'fk_modules_registered_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('modules', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_modules_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_tenants', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_user_tenants_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_tenants', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_user_tenants_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('permissions', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'fk_permissions_role_id',
      references: {
        table: 'roles',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_user_roles_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'fk_user_roles_role_id',
      references: {
        table: 'roles',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_user_roles_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_user_roles_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['assigned_by'],
      type: 'foreign key',
      name: 'fk_user_roles_assigned_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('api_keys', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_api_keys_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('api_keys', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_api_keys_created_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('api_key_permissions', {
      fields: ['api_key_id'],
      type: 'foreign key',
      name: 'fk_api_key_permissions_api_key_id',
      references: {
        table: 'api_keys',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('sessions', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_sessions_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('sessions', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_sessions_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('audit_logs', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_audit_logs_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('audit_logs', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_audit_logs_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('health_checks', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_health_checks_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('health_history', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_health_history_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_connections', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_qms_connections_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_connections', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_qms_connections_created_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_jobs', {
      fields: ['connection_id'],
      type: 'foreign key',
      name: 'fk_qms_sync_jobs_connection_id',
      references: {
        table: 'qms_connections',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_jobs', {
      fields: ['triggered_by'],
      type: 'foreign key',
      name: 'fk_qms_sync_jobs_triggered_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_conflicts', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_qms_sync_conflicts_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_conflicts', {
      fields: ['sync_job_id'],
      type: 'foreign key',
      name: 'fk_qms_sync_conflicts_sync_job_id',
      references: {
        table: 'qms_sync_jobs',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_conflicts', {
      fields: ['qms_connection_id'],
      type: 'foreign key',
      name: 'fk_qms_sync_conflicts_qms_connection_id',
      references: {
        table: 'qms_connections',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_sync_conflicts', {
      fields: ['resolved_by'],
      type: 'foreign key',
      name: 'fk_qms_sync_conflicts_resolved_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_entity_mappings', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_qms_entity_mappings_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_entity_mappings', {
      fields: ['qms_connection_id'],
      type: 'foreign key',
      name: 'fk_qms_entity_mappings_qms_connection_id',
      references: {
        table: 'qms_connections',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_entity_mappings', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_qms_entity_mappings_created_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('qms_entity_mappings', {
      fields: ['updated_by'],
      type: 'foreign key',
      name: 'fk_qms_entity_mappings_updated_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_completions', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_ai_completions_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_completions', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_ai_completions_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_completions', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_ai_completions_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_completions', {
      fields: ['prompt_template_id'],
      type: 'foreign key',
      name: 'fk_ai_completions_prompt_template_id',
      references: {
        table: 'ai_prompt_templates',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_usage', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_ai_usage_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_usage', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_ai_usage_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_usage', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_ai_usage_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_prompt_templates', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_ai_prompt_templates_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_prompt_templates', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'fk_ai_prompt_templates_created_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('ai_prompt_templates', {
      fields: ['updated_by'],
      type: 'foreign key',
      name: 'fk_ai_prompt_templates_updated_by',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('event_logs', {
      fields: ['tenant_id'],
      type: 'foreign key',
      name: 'fk_event_logs_tenant_id',
      references: {
        table: 'tenants',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('modules', 'fk_modules_registered_by');
    await queryInterface.removeConstraint('modules', 'fk_modules_tenant_id');
    await queryInterface.removeConstraint('user_tenants', 'fk_user_tenants_user_id');
    await queryInterface.removeConstraint('user_tenants', 'fk_user_tenants_tenant_id');
    await queryInterface.removeConstraint('permissions', 'fk_permissions_role_id');
    await queryInterface.removeConstraint('user_roles', 'fk_user_roles_user_id');
    await queryInterface.removeConstraint('user_roles', 'fk_user_roles_role_id');
    await queryInterface.removeConstraint('user_roles', 'fk_user_roles_tenant_id');
    await queryInterface.removeConstraint('user_roles', 'fk_user_roles_module_id');
    await queryInterface.removeConstraint('user_roles', 'fk_user_roles_assigned_by');
    await queryInterface.removeConstraint('api_keys', 'fk_api_keys_tenant_id');
    await queryInterface.removeConstraint('api_keys', 'fk_api_keys_created_by');
    await queryInterface.removeConstraint('api_key_permissions', 'fk_api_key_permissions_api_key_id');
    await queryInterface.removeConstraint('sessions', 'fk_sessions_user_id');
    await queryInterface.removeConstraint('sessions', 'fk_sessions_tenant_id');
    await queryInterface.removeConstraint('audit_logs', 'fk_audit_logs_user_id');
    await queryInterface.removeConstraint('audit_logs', 'fk_audit_logs_tenant_id');
    await queryInterface.removeConstraint('health_checks', 'fk_health_checks_module_id');
    await queryInterface.removeConstraint('health_history', 'fk_health_history_module_id');
    await queryInterface.removeConstraint('qms_connections', 'fk_qms_connections_tenant_id');
    await queryInterface.removeConstraint('qms_connections', 'fk_qms_connections_created_by');
    await queryInterface.removeConstraint('qms_sync_jobs', 'fk_qms_sync_jobs_connection_id');
    await queryInterface.removeConstraint('qms_sync_jobs', 'fk_qms_sync_jobs_triggered_by');
    await queryInterface.removeConstraint('qms_sync_conflicts', 'fk_qms_sync_conflicts_tenant_id');
    await queryInterface.removeConstraint('qms_sync_conflicts', 'fk_qms_sync_conflicts_sync_job_id');
    await queryInterface.removeConstraint('qms_sync_conflicts', 'fk_qms_sync_conflicts_qms_connection_id');
    await queryInterface.removeConstraint('qms_sync_conflicts', 'fk_qms_sync_conflicts_resolved_by');
    await queryInterface.removeConstraint('qms_entity_mappings', 'fk_qms_entity_mappings_tenant_id');
    await queryInterface.removeConstraint('qms_entity_mappings', 'fk_qms_entity_mappings_qms_connection_id');
    await queryInterface.removeConstraint('qms_entity_mappings', 'fk_qms_entity_mappings_created_by');
    await queryInterface.removeConstraint('qms_entity_mappings', 'fk_qms_entity_mappings_updated_by');
    await queryInterface.removeConstraint('ai_completions', 'fk_ai_completions_tenant_id');
    await queryInterface.removeConstraint('ai_completions', 'fk_ai_completions_module_id');
    await queryInterface.removeConstraint('ai_completions', 'fk_ai_completions_user_id');
    await queryInterface.removeConstraint('ai_completions', 'fk_ai_completions_prompt_template_id');
    await queryInterface.removeConstraint('ai_usage', 'fk_ai_usage_tenant_id');
    await queryInterface.removeConstraint('ai_usage', 'fk_ai_usage_module_id');
    await queryInterface.removeConstraint('ai_usage', 'fk_ai_usage_user_id');
    await queryInterface.removeConstraint('ai_prompt_templates', 'fk_ai_prompt_templates_tenant_id');
    await queryInterface.removeConstraint('ai_prompt_templates', 'fk_ai_prompt_templates_created_by');
    await queryInterface.removeConstraint('ai_prompt_templates', 'fk_ai_prompt_templates_updated_by');
    await queryInterface.removeConstraint('event_logs', 'fk_event_logs_tenant_id');

  }
};

