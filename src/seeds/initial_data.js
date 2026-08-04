'use strict';

/**
 * QAssure Platform - Initial Data Seeder
 * 
 * Enterprise seeder for all tenant-specific default data.
 * 
 * Rules:
 *   - No hardcoded tenant UUIDs anywhere
 *   - No hardcoded row UUIDs anywhere - let the database generate them
 *   - All inserts use ON CONFLICT DO NOTHING for idempotency
 *   - Workflow steps/transitions chain using RETURNING id
 *   - Run after migrations complete
 *   - Safe to run multiple times
 * 
 * Usage:
 *   node src/seeds/initial_data.js
 *   node src/seeds/initial_data.js --tenant=pharmacorp   (seed specific tenant by slug)
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

// ============================================================================
// RUNNER
// ============================================================================

async function run() {
  const targetSlug = getArgument('--tenant');

  console.log('QAssure Initial Data Seeder');
  console.log('─'.repeat(60));

  try {
    // Get tenants to seed
    let query = 'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY created_at';
    let params = ['active'];

    if (targetSlug) {
      query = 'SELECT id, name, slug FROM tenants WHERE slug = $1 AND status = $2';
      params = [targetSlug, 'active'];
      console.log('Targeting tenant: ' + targetSlug);
    }

    const [tenants] = await sequelize.query(query, { bind: params });

    if (tenants.length === 0) {
      console.log('No active tenants found. Exiting.');
      return;
    }

    console.log('Found ' + tenants.length + ' tenant(s) to seed\n');

    const stats = { success: 0, failed: 0, skipped: 0 };

    for (const tenant of tenants) {
      console.log('Seeding tenant: ' + tenant.name + ' (' + tenant.id + ')');
      console.log('─'.repeat(40));

      try {
        await seedTenant(tenant.id, tenant.name);
        stats.success++;
        console.log('Tenant seeded successfully: ' + tenant.name + '\n');
      } catch (error) {
        stats.failed++;
        console.error('Failed to seed tenant ' + tenant.name + ': ' + error.message + '\n');
      }
    }

    console.log('─'.repeat(60));
    console.log('Summary: ' + stats.success + ' succeeded | ' + stats.failed + ' failed');

  } catch (error) {
    console.error('Seeder crashed: ' + error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// ============================================================================
// TENANT SEEDER — runs all sections for one tenant
// ============================================================================

async function seedTenant(tenantId, tenantName) {
  await seedDocumentCategories(tenantId);
  await seedDocumentWorkflow(tenantId);
  await seedTrainingCourses(tenantId);
  await seedTrainingWorkflow(tenantId);
  await seedCapaWorkflow(tenantId);
  await seedSupplierWorkflow(tenantId);
  await seedSimpleApprovalWorkflow(tenantId);
  await seedKpiDefinitions(tenantId);
  await seedReportDefinitions(tenantId);
  await seedEscalationRules(tenantId);
  await seedAlertRules(tenantId);
  await seedStorageQuota(tenantId);
}

// ============================================================================
// 1. DOCUMENT CATEGORIES
// Source: phase15_document_management.sql
// ============================================================================

async function seedDocumentCategories(tenantId) {
  const categories = [
    { name: 'Standard Operating Procedures', code: 'SOP', description: 'Step-by-step instructions for processes', requires_training: true,  retention_years: 7,  review_frequency_months: 12 },
    { name: 'Work Instructions',              code: 'WI',  description: 'Detailed task instructions',            requires_training: true,  retention_years: 7,  review_frequency_months: 24 },
    { name: 'Policies',                       code: 'POL', description: 'Company policies and guidelines',       requires_training: false, retention_years: 10, review_frequency_months: 12 },
    { name: 'Forms',                          code: 'FRM', description: 'Fillable forms and templates',          requires_training: false, retention_years: 5,  review_frequency_months: 24 },
    { name: 'Specifications',                 code: 'SPEC',description: 'Product and process specifications',    requires_training: true,  retention_years: 10, review_frequency_months: 12 },
    { name: 'Quality Manual',                 code: 'QM',  description: 'Quality management system documentation', requires_training: true, retention_years: 10, review_frequency_months: 12 },
  ];

  for (const cat of categories) {
    await sequelize.query(
      `INSERT INTO document_categories (tenant_id, name, code, description, requires_training, retention_years, review_frequency_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      { bind: [tenantId, cat.name, cat.code, cat.description, cat.requires_training, cat.retention_years, cat.review_frequency_months] }
    );
  }
  console.log('  Document categories seeded');
}

// ============================================================================
// 2. DOCUMENT APPROVAL WORKFLOW
// Source: phase15_document_management.sql
// ============================================================================

async function seedDocumentWorkflow(tenantId) {
  // Skip if already exists
  const [existing] = await sequelize.query(
    `SELECT id FROM workflow_definitions WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    { bind: [tenantId, 'document_approval'] }
  );
  if (existing.length > 0) {
    console.log('  Document workflow already exists, skipping');
    return;
  }

  // Create workflow definition
  const [defRows] = await sequelize.query(
    `INSERT INTO workflow_definitions (tenant_id, name, description, code, entity_type, status, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    { bind: [tenantId, 'Document Approval', 'Standard document review and approval workflow', 'document_approval', 'document', 'active', true] }
  );
  const defId = defRows[0].id;

  // Create steps
  const [step1] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    { bind: [defId, tenantId, 'draft', 'Draft', 1, 'initial', 'originator', false, '["submit_for_review"]'] }
  );

  const [step2] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions, sla_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    { bind: [defId, tenantId, 'review', 'Technical Review', 2, 'approval', 'role', 'quality_manager', false, '["approve","reject","request_changes"]', 48] }
  );

  const [step3] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions, sla_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    { bind: [defId, tenantId, 'approval', 'Final Approval', 3, 'approval', 'role', 'qa_director', true, '["approve","reject"]', 24] }
  );

  const [step4] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, requires_signature, available_actions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    { bind: [defId, tenantId, 'effective', 'Effective', 4, 'terminal', false, '[]'] }
  );

  const s1 = step1[0].id, s2 = step2[0].id, s3 = step3[0].id, s4 = step4[0].id;

  // Create transitions
  const transitions = [
    [defId, tenantId, s1, s2, 'submit_for_review', 'Submit for Review',       false, null],
    [defId, tenantId, s2, s3, 'approve',            'Approve and Forward',     false, null],
    [defId, tenantId, s2, s1, 'reject',              'Reject',                  false, null],
    [defId, tenantId, s2, s1, 'request_changes',     'Request Changes',         false, null],
    [defId, tenantId, s3, s4, 'approve',             'Approve and Make Effective', true, 'I approve this document for release'],
    [defId, tenantId, s3, s1, 'reject',              'Reject',                  false, null],
  ];

  for (const t of transitions) {
    await sequelize.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, tenant_id, from_step_id, to_step_id, action, name, requires_signature, signature_meaning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      { bind: t }
    );
  }
  console.log('  Document approval workflow seeded');
}

// ============================================================================
// 3. TRAINING COURSES (defaults)
// Source: phase16_training_management.sql
// ============================================================================

async function seedTrainingCourses(tenantId) {
  const courses = [
    { code: 'GMP-101', title: 'Good Manufacturing Practice Fundamentals', description: 'Introduction to GMP principles and requirements',        type: 'online', category: 'compliance', hours: 2.0,  recert_months: 12 },
    { code: 'QMS-101', title: 'Quality Management System Overview',        description: 'Understanding ISO 9001 and QMS principles',             type: 'online', category: 'quality',     hours: 1.5,  recert_months: 24 },
    { code: 'DOC-101', title: 'Document Control Training',                 description: 'Proper document handling and control procedures',       type: 'online', category: 'compliance', hours: 1.0,  recert_months: 12 },
  ];

  for (const c of courses) {
    await sequelize.query(
      `INSERT INTO training_courses (tenant_id, course_code, title, description, course_type, category, duration_hours, passing_score, status, requires_recertification, recertification_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 80, 'active', true, $8)
       ON CONFLICT (tenant_id, course_code) DO NOTHING`,
      { bind: [tenantId, c.code, c.title, c.description, c.type, c.category, c.hours, c.recert_months] }
    );
  }
  console.log('  Training courses seeded');
}

// ============================================================================
// 4. TRAINING COMPLETION WORKFLOW
// Source: phase16_training_management.sql
// ============================================================================

async function seedTrainingWorkflow(tenantId) {
  const [existing] = await sequelize.query(
    `SELECT id FROM workflow_definitions WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    { bind: [tenantId, 'training_completion'] }
  );
  if (existing.length > 0) {
    console.log('  Training workflow already exists, skipping');
    return;
  }

  const [defRows] = await sequelize.query(
    `INSERT INTO workflow_definitions (tenant_id, name, description, code, entity_type, status, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    { bind: [tenantId, 'Training Completion', 'Training assignment completion workflow', 'training_completion', 'training', 'active', true] }
  );
  const defId = defRows[0].id;

  const [s1] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    { bind: [defId, tenantId, 'assigned', 'Assigned', 1, 'initial', 'originator', false, '["start"]'] }
  );
  const [s2] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    { bind: [defId, tenantId, 'in_progress', 'In Progress', 2, 'task', 'originator', false, '["complete","request_extension"]'] }
  );
  const [s3] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    { bind: [defId, tenantId, 'acknowledge', 'Acknowledge Completion', 3, 'approval', 'originator', true, '["acknowledge"]'] }
  );
  const [s4] = await sequelize.query(
    `INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, requires_signature, available_actions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    { bind: [defId, tenantId, 'completed', 'Completed', 4, 'terminal', false, '[]'] }
  );

  const transitions = [
    [defId, tenantId, s1[0].id, s2[0].id, 'start',        'Start Training',         false],
    [defId, tenantId, s2[0].id, s3[0].id, 'complete',      'Complete Training',      false],
    [defId, tenantId, s3[0].id, s4[0].id, 'acknowledge',   'Acknowledge Completion', true],
  ];
  for (const t of transitions) {
    await sequelize.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, tenant_id, from_step_id, to_step_id, action, name, requires_signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      { bind: t }
    );
  }
  console.log('  Training completion workflow seeded');
}

// ============================================================================
// 5. CAPA WORKFLOW
// Source: phase17_capa_management.sql
// ============================================================================

async function seedCapaWorkflow(tenantId) {
  const [existing] = await sequelize.query(
    `SELECT id FROM workflow_definitions WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    { bind: [tenantId, 'capa_workflow'] }
  );
  if (existing.length > 0) {
    console.log('  CAPA workflow already exists, skipping');
    return;
  }

  const [defRows] = await sequelize.query(
    `INSERT INTO workflow_definitions (tenant_id, name, description, code, entity_type, status, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    { bind: [tenantId, 'CAPA Workflow', 'Full CAPA lifecycle workflow', 'capa_workflow', 'capa', 'active', true] }
  );
  const defId = defRows[0].id;

  const [s1] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, { bind: [defId, tenantId, 'draft',          'Draft',                      1, 'initial',  'originator',     false, '["submit"]'] });
  const [s2] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions, sla_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, { bind: [defId, tenantId, 'investigation',  'Investigation',              2, 'task',     'originator',     false, '["complete_investigation"]', 120] });
  const [s3] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions, sla_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, { bind: [defId, tenantId, 'action_plan',    'Action Plan Review',         3, 'approval', 'role', 'quality_manager', true,  '["approve","reject"]', 48] });
  const [s4] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions, sla_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, { bind: [defId, tenantId, 'implementation', 'Implementation',             4, 'task',     'originator',     false, '["complete_implementation"]', 240] });
  const [s5] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions, sla_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, { bind: [defId, tenantId, 'verification',   'Effectiveness Verification', 5, 'approval', 'role', 'quality_manager', true,  '["verify_effective","verify_ineffective"]', 72] });
  const [s6] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, { bind: [defId, tenantId, 'closed',         'Closed',                     6, 'terminal', false, '[]'] });

  const transitions = [
    [defId, tenantId, s1[0].id, s2[0].id, 'submit',                  'Submit for Investigation',   false, null],
    [defId, tenantId, s2[0].id, s3[0].id, 'complete_investigation',   'Submit Investigation',        false, null],
    [defId, tenantId, s3[0].id, s4[0].id, 'approve',                  'Approve Action Plan',         true,  'I approve this action plan'],
    [defId, tenantId, s3[0].id, s2[0].id, 'reject',                   'Reject - More Investigation', false, null],
    [defId, tenantId, s4[0].id, s5[0].id, 'complete_implementation',  'Submit for Verification',     false, null],
    [defId, tenantId, s5[0].id, s6[0].id, 'verify_effective',         'Verify Effective - Close',    true,  'I verify this CAPA is effective'],
    [defId, tenantId, s5[0].id, s4[0].id, 'verify_ineffective',       'Not Effective - Reopen',      false, null],
  ];
  for (const t of transitions) {
    await sequelize.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, tenant_id, from_step_id, to_step_id, action, name, requires_signature, signature_meaning) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      { bind: t }
    );
  }
  console.log('  CAPA workflow seeded');
}

// ============================================================================
// 6. SUPPLIER APPROVAL WORKFLOW
// Source: phase18_supplier_quality.sql
// ============================================================================

async function seedSupplierWorkflow(tenantId) {
  const [existing] = await sequelize.query(
    `SELECT id FROM workflow_definitions WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    { bind: [tenantId, 'supplier_approval'] }
  );
  if (existing.length > 0) {
    console.log('  Supplier workflow already exists, skipping');
    return;
  }

  const [defRows] = await sequelize.query(
    `INSERT INTO workflow_definitions (tenant_id, name, description, code, entity_type, status, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    { bind: [tenantId, 'Supplier Approval', 'Supplier qualification and approval workflow', 'supplier_approval', 'supplier', 'active', true] }
  );
  const defId = defRows[0].id;

  const [s1] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, { bind: [defId, tenantId, 'draft',         'Draft',               1, 'initial',  'originator', false, '["submit"]'] });
  const [s2] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, { bind: [defId, tenantId, 'qualification', 'Qualification Review', 2, 'task',     'role', 'quality_manager', false, '["approve_qualification","reject"]'] });
  const [s3] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, { bind: [defId, tenantId, 'audit',         'Audit Required',      3, 'task',     'role', 'quality_manager', false, '["complete_audit","waive_audit"]'] });
  const [s4] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, assignee_role, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, { bind: [defId, tenantId, 'approval',      'Final Approval',      4, 'approval', 'role', 'qa_director',     true,  '["approve","conditional_approve","reject"]'] });
  const [s5] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, { bind: [defId, tenantId, 'approved',      'Approved',            5, 'terminal', false, '[]'] });

  const transitions = [
    [defId, tenantId, s1[0].id, s2[0].id, 'submit',               'Submit for Qualification', false],
    [defId, tenantId, s2[0].id, s3[0].id, 'approve_qualification', 'Approve Qualification',    false],
    [defId, tenantId, s2[0].id, s1[0].id, 'reject',               'Reject',                   false],
    [defId, tenantId, s3[0].id, s4[0].id, 'complete_audit',       'Complete Audit',            false],
    [defId, tenantId, s3[0].id, s4[0].id, 'waive_audit',          'Waive Audit',               false],
    [defId, tenantId, s4[0].id, s5[0].id, 'approve',              'Approve Supplier',          true],
    [defId, tenantId, s4[0].id, s5[0].id, 'conditional_approve',  'Conditional Approval',      true],
    [defId, tenantId, s4[0].id, s1[0].id, 'reject',               'Reject',                   false],
  ];
  for (const t of transitions) {
    await sequelize.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, tenant_id, from_step_id, to_step_id, action, name, requires_signature) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      { bind: t }
    );
  }
  console.log('  Supplier approval workflow seeded');
}

// ============================================================================
// 7. SIMPLE APPROVAL WORKFLOW (Generic)
// Source: phase14_workflow_engine.sql
// ============================================================================

async function seedSimpleApprovalWorkflow(tenantId) {
  const [existing] = await sequelize.query(
    `SELECT id FROM workflow_definitions WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    { bind: [tenantId, 'simple_approval'] }
  );
  if (existing.length > 0) {
    console.log('  Simple approval workflow already exists, skipping');
    return;
  }

  const [defRows] = await sequelize.query(
    `INSERT INTO workflow_definitions (tenant_id, name, description, code, entity_type, status, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    { bind: [tenantId, 'Simple Approval', 'Basic two-step approval workflow', 'simple_approval', 'generic', 'active', false] }
  );
  const defId = defRows[0].id;

  const [s1] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, { bind: [defId, tenantId, 'draft',     'Draft',           1, 'initial',  'originator', false, '["submit"]'] });
  const [s2] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, assignee_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, { bind: [defId, tenantId, 'review',    'Review & Approve', 2, 'approval', 'role',       true,  '["approve","reject"]'] });
  const [s3] = await sequelize.query(`INSERT INTO workflow_steps (workflow_definition_id, tenant_id, step_code, name, sequence, step_type, requires_signature, available_actions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, { bind: [defId, tenantId, 'completed', 'Completed',       3, 'terminal', false, '[]'] });

  const transitions = [
    [defId, tenantId, s1[0].id, s2[0].id, 'submit',  'Submit for Review', false, null],
    [defId, tenantId, s2[0].id, s3[0].id, 'approve', 'Approve',           true,  'I approve this record'],
    [defId, tenantId, s2[0].id, s1[0].id, 'reject',  'Reject',            false, null],
  ];
  for (const t of transitions) {
    await sequelize.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, tenant_id, from_step_id, to_step_id, action, name, requires_signature, signature_meaning) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      { bind: t }
    );
  }
  console.log('  Simple approval workflow seeded');
}

// ============================================================================
// 8. KPI DEFINITIONS
// Source: phase19_reporting_analytics.sql
// ============================================================================

async function seedKpiDefinitions(tenantId) {
  const kpis = [
    { name: 'Open CAPAs',                  code: 'capa_open_count',      description: 'Number of open CAPAs',                                module: 'capa',      calc: 'count',      query: '{"table":"capas","filter":{"status":["open","investigation","action"]}}',  target: null, direction: 'lower_better', unit: 'count' },
    { name: 'CAPA On-Time Closure Rate',   code: 'capa_ontime_rate',     description: 'Percentage of CAPAs closed on time',                  module: 'capa',      calc: 'percentage', query: '{"numerator":"closed_on_time","denominator":"total_closed"}',              target: 90,   direction: 'higher_better', unit: '%' },
    { name: 'Overdue CAPAs',               code: 'capa_overdue_count',   description: 'Number of overdue CAPAs',                             module: 'capa',      calc: 'count',      query: '{"table":"capas","filter":{"overdue":true}}',                             target: 0,    direction: 'lower_better', unit: 'count' },
    { name: 'Training Compliance Rate',    code: 'training_compliance',  description: 'Percentage of completed training assignments',         module: 'training',  calc: 'percentage', query: '{"numerator":"completed","denominator":"total_assigned"}',                 target: 95,   direction: 'higher_better', unit: '%' },
    { name: 'Overdue Training',            code: 'training_overdue',     description: 'Number of overdue training assignments',               module: 'training',  calc: 'count',      query: '{"table":"training_assignments","filter":{"status":"overdue"}}',          target: 0,    direction: 'lower_better', unit: 'count' },
    { name: 'Documents Due for Review',    code: 'docs_due_review',      description: 'Documents needing periodic review',                    module: 'documents', calc: 'count',      query: '{"table":"documents","filter":{"review_due":true}}',                     target: null, direction: 'lower_better', unit: 'count' },
    { name: 'Document Currency Rate',      code: 'docs_currency_rate',   description: 'Percentage of documents current (not overdue)',        module: 'documents', calc: 'percentage', query: '{"numerator":"current","denominator":"total_effective"}',                 target: 98,   direction: 'higher_better', unit: '%' },
    { name: 'Approved Suppliers',          code: 'supplier_approved',    description: 'Number of approved suppliers',                         module: 'suppliers', calc: 'count',      query: '{"table":"suppliers","filter":{"status":"approved"}}',                   target: null, direction: null,            unit: 'count' },
    { name: 'Average Supplier Score',      code: 'supplier_avg_score',   description: 'Average supplier performance score',                   module: 'suppliers', calc: 'average',    query: '{"table":"suppliers","field":"current_score","filter":{"status":"approved"}}', target: 85, direction: 'higher_better', unit: 'score' },
    { name: 'Suppliers Expiring Soon',     code: 'supplier_expiring',    description: 'Suppliers with approval expiring in 30 days',         module: 'suppliers', calc: 'count',      query: '{"table":"suppliers","filter":{"expiring_days":30}}',                   target: 0,    direction: 'lower_better', unit: 'count' },
  ];

  for (const kpi of kpis) {
    await sequelize.query(
      `INSERT INTO kpi_definitions (tenant_id, name, code, description, module, calculation_type, query_config, target_value, target_direction, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      { bind: [tenantId, kpi.name, kpi.code, kpi.description, kpi.module, kpi.calc, kpi.query, kpi.target, kpi.direction, kpi.unit] }
    );
  }
  console.log('  KPI definitions seeded');
}

// ============================================================================
// 9. REPORT DEFINITIONS
// Source: phase19_reporting_analytics.sql
// ============================================================================

async function seedReportDefinitions(tenantId) {
  const reports = [
    { name: 'Executive Quality Dashboard', code: 'exec_dashboard',      type: 'dashboard',  category: 'executive', module: 'all',       config: '{"widgets":["capa_summary","training_compliance","supplier_score","doc_status"]}' },
    { name: 'CAPA Summary Report',         code: 'capa_summary',        type: 'summary',    category: 'capa',      module: 'capa',      config: '{"groupBy":"status","metrics":["count","avg_days_open"]}' },
    { name: 'Training Compliance Report',  code: 'training_compliance', type: 'compliance', category: 'training',  module: 'training',  config: '{"groupBy":"department","metrics":["compliance_rate","overdue_count"]}' },
    { name: 'Supplier Scorecard Report',   code: 'supplier_scorecard',  type: 'summary',    category: 'supplier',  module: 'suppliers', config: '{"groupBy":"category","metrics":["avg_score","count_by_grade"]}' },
    { name: 'Document Review Status',      code: 'doc_review_status',   type: 'list',       category: 'quality',   module: 'documents', config: '{"filter":{"review_due":true},"columns":["document_number","title","next_review_date","owner"]}' },
    { name: 'Monthly Quality Metrics',     code: 'monthly_quality',     type: 'trend',      category: 'executive', module: 'all',       config: '{"period":"monthly","metrics":["capa_closure_rate","training_compliance","supplier_avg_score"]}' },
  ];

  for (const r of reports) {
    await sequelize.query(
      `INSERT INTO report_definitions (tenant_id, name, code, report_type, category, module, config, is_system, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,true)
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      { bind: [tenantId, r.name, r.code, r.type, r.category, r.module, r.config] }
    );
  }
  console.log('  Report definitions seeded');
}

// ============================================================================
// 10. ESCALATION RULES
// Source: phase20_notifications.sql
// ============================================================================

async function seedEscalationRules(tenantId) {
  const rules = [
    { name: 'CAPA Overdue 3 Days',          entity: 'capa',          condition: 'overdue', value: 3,  role: 'quality_manager',    interval: 24 },
    { name: 'CAPA Overdue 7 Days',          entity: 'capa',          condition: 'overdue', value: 7,  role: 'qa_director',        interval: 24 },
    { name: 'Training Overdue 5 Days',      entity: 'training',      condition: 'overdue', value: 5,  role: 'department_manager', interval: 24 },
    { name: 'Workflow Task Overdue 2 Days', entity: 'workflow_task', condition: 'overdue', value: 2,  role: 'quality_manager',    interval: 12 },
  ];

  for (const r of rules) {
    await sequelize.query(
      `INSERT INTO escalation_rules (tenant_id, name, entity_type, condition_type, condition_value, escalate_to_role, check_interval_hours, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT DO NOTHING`,
      { bind: [tenantId, r.name, r.entity, r.condition, r.value, r.role, r.interval] }
    );
  }
  console.log('  Escalation rules seeded');
}

// ============================================================================
// 11. ALERT RULES
// Source: phase20_notifications.sql
// ============================================================================

async function seedAlertRules(tenantId) {
  const rules = [
    { name: 'Critical CAPA Created', event: 'capa.created',      conditions: '{"priority":"critical"}', notify_owner: true,  roles: ['quality_manager'], channels: ['in_app','email'] },
    { name: 'Document Approved',     event: 'document.approved', conditions: '{}',                      notify_owner: true,  roles: null,                channels: ['in_app','email'] },
    { name: 'Training Assigned',     event: 'training.assigned', conditions: '{}',                      notify_owner: true,  roles: null,                channels: ['in_app','email'] },
  ];

  for (const r of rules) {
    await sequelize.query(
      `INSERT INTO alert_rules (tenant_id, name, trigger_event, trigger_conditions, notify_owner, notify_roles, channels, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT DO NOTHING`,
      { bind: [tenantId, r.name, r.event, r.conditions, r.notify_owner, r.roles, r.channels] }
    );
  }
  console.log('  Alert rules seeded');
}

// ============================================================================
// 12. STORAGE QUOTA
// Source: phase21_file_attachments.sql
// ============================================================================

async function seedStorageQuota(tenantId) {
  await sequelize.query(
    `INSERT INTO storage_quotas (tenant_id, max_storage_bytes, max_file_size_bytes)
     VALUES ($1, 10737418240, 104857600)
     ON CONFLICT (tenant_id) DO NOTHING`,
    { bind: [tenantId] }
  );
  console.log('  Storage quota seeded');
}

// ============================================================================
// UTILITIES
// ============================================================================

function getArgument(key) {
  const arg = process.argv.find(a => a.startsWith(key + '='));
  return arg ? arg.split('=')[1] : null;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  run();
}

module.exports = { run, seedTenant };
