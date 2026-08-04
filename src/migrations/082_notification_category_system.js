'use strict';

/**
 * Migration 082: Notification Category + Code Master System
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // ─── 1. CREATE notification_categories ──────────────────────────────────
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('notification_categories')) {
      await queryInterface.createTable('notification_categories', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        module_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'modules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });

      await queryInterface.addIndex('notification_categories', ['code'], { name: 'idx_notification_categories_code', unique: true });
      await queryInterface.addIndex('notification_categories', ['module_id'], { name: 'idx_notification_categories_module' });
    }

    // ─── 2. CREATE notification_codes ────────────────────────────────────────
    if (!tables.includes('notification_codes')) {
      await queryInterface.createTable('notification_codes', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        category_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'notification_categories', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        code: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        default_channels: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: ['in_app', 'email']
        },
        default_priority: {
          type: Sequelize.STRING(20),
          defaultValue: 'normal'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });

      await queryInterface.addIndex('notification_codes', ['code'], { name: 'idx_notification_codes_code', unique: true });
      await queryInterface.addIndex('notification_codes', ['category_id'], { name: 'idx_notification_codes_category' });
    }

    // ─── 3. ALTER notification_templates / notifications ────────────────────
    const templateInfo = await queryInterface.describeTable('notification_templates');
    if (!templateInfo.module_id) {
      await queryInterface.addColumn('notification_templates', 'module_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    if (!templateInfo.updated_at) {
      await queryInterface.addColumn('notification_templates', 'updated_at', { type: Sequelize.DATE, allowNull: true });
    }
    if (!templateInfo.updated_by) {
      await queryInterface.addColumn('notification_templates', 'updated_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    const notifInfo = await queryInterface.describeTable('notifications');
    if (!notifInfo.module_id) {
      await queryInterface.addColumn('notifications', 'module_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('notifications', ['module_id'], { name: 'idx_notifications_module_id' });
    }
    if (!notifInfo.created_by) {
      await queryInterface.addColumn('notifications', 'created_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    if (!notifInfo.template_id) {
      await queryInterface.addColumn('notifications', 'template_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'notification_templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // ─── 5. SEED platform categories ────────────────────────────────────────
    await queryInterface.sequelize.query(`
      INSERT INTO notification_categories (id, name, code, description, module_id, is_active, created_at, updated_at)
      VALUES
        ('10000000-0000-0000-0000-000000000001', 'CAPA',     'capa',     'Corrective And Preventive Actions',    NULL, TRUE, NOW(), NOW()),
        ('10000000-0000-0000-0000-000000000002', 'Document', 'document', 'Document management activities',       NULL, TRUE, NOW(), NOW()),
        ('10000000-0000-0000-0000-000000000003', 'Training', 'training', 'Training assignments and completions', NULL, TRUE, NOW(), NOW()),
        ('10000000-0000-0000-0000-000000000004', 'Workflow', 'workflow', 'Workflow tasks and approvals',         NULL, TRUE, NOW(), NOW()),
        ('10000000-0000-0000-0000-000000000005', 'Supplier', 'supplier', 'Supplier quality management',          NULL, TRUE, NOW(), NOW()),
        ('10000000-0000-0000-0000-000000000006', 'System',   'system',   'Platform system notifications',        NULL, TRUE, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `);

    // ─── 6. SEED platform codes ─────────────────────────────────────────────
    await queryInterface.sequelize.query(`
      INSERT INTO notification_codes (id, category_id, code, name, description, default_channels, default_priority, is_active, created_at, updated_at)
      VALUES
        -- CAPA
        ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','capa_assigned',       'CAPA Assigned',            'Triggered when a user is assigned as CAPA owner',           ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','capa_overdue',        'CAPA Overdue',             'Triggered when CAPA passes its target date',                ARRAY['in_app','email'],'urgent','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','capa_closed',         'CAPA Closed',              'Triggered when a CAPA is closed',                          ARRAY['in_app','email'],'low',   'true', NOW(), NOW()),
        -- Document
        ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','document_review_due', 'Document Review Due',      'Periodic review reminder',                                 ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','document_approved',   'Document Approved',        'Triggered when a document is approved',                    ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002','document_rejected',   'Document Rejected',        'Triggered when a document is rejected',                    ARRAY['in_app','email'],'high',  'true', NOW(), NOW()),
        (gen_random_uuid(),'10000000-0000-0000-0000-000000000002','document_submitted', 'Document Submitted', 'Triggered when a document is submitted for review', ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        (gen_random_uuid(),'10000000-0000-0000-0000-000000000002','document_effective', 'Document Effective', 'Triggered when a document is made effective', ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        -- Training
        ('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000003','training_assigned',   'Training Assigned',        'Triggered when training is assigned to a user',            ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000003','training_due_soon',   'Training Due Soon',        'Training due within the warning window',                   ARRAY['in_app','email'],'high',  'true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000003','training_overdue',    'Training Overdue',         'Training deadline missed',                                 ARRAY['in_app','email'],'urgent','true', NOW(), NOW()),
        (gen_random_uuid(),'10000000-0000-0000-0000-000000000003','training_completed', 'Training Completed', 'Triggered when a user completes a training course', ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        -- Workflow
        ('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000004','workflow_task_assigned','Workflow Task Assigned',  'Triggered when a workflow task is assigned to a user',    ARRAY['in_app','email'],'high',  'true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000004','workflow_task_overdue', 'Workflow Task Overdue',   'Triggered when a workflow task passes its due date',      ARRAY['in_app','email'],'urgent','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000004','workflow_escalated',    'Workflow Task Escalated', 'Triggered when a task is escalated',                     ARRAY['in_app','email'],'urgent','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000004','workflow_completed',    'Workflow Completed',      'Triggered when a workflow reaches its terminal step',     ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000004','workflow_cancelled',    'Workflow Cancelled',      'Triggered when a workflow is cancelled',                  ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        (gen_random_uuid(),'10000000-0000-0000-0000-000000000004','project_assigned', 'Project Assigned', 'Triggered when a user is assigned to a project', ARRAY['in_app','email'],'normal','true', NOW(), NOW()),
        -- Supplier
        ('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000005','supplier_expiring',     'Supplier Expiring',       'Supplier approval near expiry',                          ARRAY['in_app','email'],'high',  'true', NOW(), NOW()),
        ('20000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000005','supplier_score_dropped','Supplier Score Dropped',  'Supplier score fell below threshold',                    ARRAY['in_app','email'],'high',  'true', NOW(), NOW()),
        -- System
        ('20000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000006','welcome',              'Welcome',                  'First login welcome notification',                       ARRAY['in_app'],        'low',   'true', NOW(), NOW()),
        (gen_random_uuid(),'10000000-0000-0000-0000-000000000006','file_shared', 'File Shared', 'Triggered when a file is shared with a user', ARRAY['in_app','email'],'normal','true', NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `);

    // ─── 7. SEED platform templates ──────────────────────────────────────────
    await queryInterface.sequelize.query(`
      INSERT INTO notification_templates
        (id, tenant_id, code, name, category,
         title_template, message_template,
         email_subject_template, email_body_template,
         default_priority, channels, is_active, created_at)
      VALUES
        (gen_random_uuid(), NULL, 'workflow_completed', 'Workflow Completed', 'workflow', 'Workflow Completed: {{entity_name}}', 'The workflow for {{entity_name}} has been completed with action: {{action}}', '[QAssure] Workflow Completed: {{entity_name}}', '<p>The workflow for <b>{{entity_name}}</b> has been completed with action: <b>{{action}}</b>.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'workflow_cancelled', 'Workflow Cancelled', 'workflow', 'Workflow Cancelled: {{entity_name}}', 'The workflow for {{entity_name}} was cancelled. Reason: {{reason}}', '[QAssure] Workflow Cancelled: {{entity_name}}', '<p>The workflow for <b>{{entity_name}}</b> was cancelled.<br>Reason: {{reason}}.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'task_assigned', 'Task Assigned (Role)', 'workflow', 'New Task for {{role}}: {{step_name}}', 'A new workflow task for your role has been assigned: {{step_name}}', '[QAssure] New Task: {{step_name}}', '<p>A new workflow task for your role has been assigned: <b>{{step_name}}</b>.</p>', 'high', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'document_submitted', 'Document Submitted', 'document', 'Document Submitted: {{document_name}}', 'The document {{document_name}} has been submitted for review by {{user_name}}.', '[QAssure] Document Submitted: {{document_name}}', '<p>The document <b>{{document_name}}</b> has been submitted for review by <b>{{user_name}}</b>.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'document_effective', 'Document Effective', 'document', 'Document Effective: {{document_name}}', 'The document {{document_name}} is now effective.', '[QAssure] Document Effective: {{document_name}}', '<p>The document <b>{{document_name}}</b> is now effective.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'training_completed', 'Training Completed', 'training', 'Training Completed: {{course_name}}', '{{user_name}} has completed the training course: {{course_name}}.', '[QAssure] Training Completed: {{course_name}}', '<p><b>{{user_name}}</b> has completed the training course: <b>{{course_name}}</b>.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'project_assigned', 'Project Assigned', 'workflow', 'Added to Project: {{project_name}}', 'You have been added to project "{{project_name}}" as {{role}}.', '[QAssure] Added to Project: {{project_name}}', '<p>You have been added to project <b>{{project_name}}</b> as <b>{{role}}</b>.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW()),
        (gen_random_uuid(), NULL, 'file_shared', 'File Shared', 'system', 'File Shared: {{file_name}}', 'A file has been shared with you: {{file_name}}.', '[QAssure] File Shared: {{file_name}}', '<p>A file has been shared with you: <b>{{file_name}}</b>.</p>', 'normal', ARRAY['in_app','email'], TRUE, NOW())
      ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code) DO NOTHING;
    `);

    // ─── 8. Seed default category_preferences ───────────────────────────────
    await queryInterface.sequelize.query(`
      UPDATE notification_preferences
      SET category_preferences = (
        '{"capa":{"in_app":true,"email":true},"document":{"in_app":true,"email":true},"training":{"in_app":true,"email":true},"workflow":{"in_app":true,"email":true},"supplier":{"in_app":true,"email":true},"system":{"in_app":true,"email":false}}'::jsonb
        || category_preferences
      ),
      updated_at = NOW()
      WHERE TRUE;
    `);

    console.log('✅ Migration 082: notification_categories + notification_codes created and seeded');
  },

  async down(queryInterface, Sequelize) {
    const notifInfo = await queryInterface.describeTable('notifications');
    if (notifInfo.template_id) await queryInterface.removeColumn('notifications', 'template_id');
    if (notifInfo.created_by)  await queryInterface.removeColumn('notifications', 'created_by');
    if (notifInfo.module_id)   await queryInterface.removeColumn('notifications', 'module_id');

    const tmplInfo = await queryInterface.describeTable('notification_templates');
    if (tmplInfo.updated_by) await queryInterface.removeColumn('notification_templates', 'updated_by');
    if (tmplInfo.updated_at) await queryInterface.removeColumn('notification_templates', 'updated_at');
    if (tmplInfo.module_id)  await queryInterface.removeColumn('notification_templates', 'module_id');

    await queryInterface.dropTable('notification_codes');
    await queryInterface.dropTable('notification_categories');
  }
};
