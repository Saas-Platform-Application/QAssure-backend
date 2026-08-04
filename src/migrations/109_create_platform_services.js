'use strict';

/**
 * Migration 109: Platform Services
 *
 * Creates:
 *   1. platform_services        — static registry of internal services
 *   2. tenant_platform_services — per-tenant enable/disable state
 *
 * Seeds all 14 controllable platform services.
 * Auto-provisions all existing tenants with every service enabled.
 */

const SERVICES = [
  { key: 'document',             name: 'Document Management',    description: 'Create, review, approve and manage controlled documents', icon: 'FileText',       category: 'quality',      sort_order: 10 },
  { key: 'training',             name: 'Training Management',    description: 'Assign, track and verify employee training compliance',   icon: 'GraduationCap',  category: 'compliance',   sort_order: 20 },
  { key: 'capa',                 name: 'CAPA Management',        description: 'Corrective and Preventive Action lifecycle management',   icon: 'AlertTriangle',  category: 'quality',      sort_order: 30 },
  { key: 'supplier',             name: 'Supplier Quality',       description: 'Supplier qualification, audit and scorecard management',  icon: 'Factory',        category: 'quality',      sort_order: 40 },
  { key: 'workflow',             name: 'Workflow Engine',        description: 'Define and execute multi-step approval workflows',        icon: 'GitBranch',      category: 'process',      sort_order: 50 },
  { key: 'project',              name: 'Project Management',     description: 'Track projects, tasks and milestones',                   icon: 'FolderOpen',     category: 'process',      sort_order: 60 },
  { key: 'reporting',            name: 'Reporting & Analytics',  description: 'KPI dashboards, reports and analytics',                  icon: 'BarChart2',      category: 'analytics',    sort_order: 70 },
  { key: 'electronic_signature', name: 'Electronic Signatures',  description: 'FDA 21 CFR Part 11 compliant electronic signatures',     icon: 'PenTool',        category: 'compliance',   sort_order: 80 },
  { key: 'ai',                   name: 'AI Gateway',             description: 'AI completions, prompts and knowledge base',             icon: 'Brain',          category: 'intelligence', sort_order: 90 },
  { key: 'qms',                  name: 'QMS Integration',        description: 'Connect to external QMS systems (Veeva, MasterControl)', icon: 'Link2',          category: 'integration',  sort_order: 100 },
  { key: 'file_attachment',      name: 'File Attachments',       description: 'Upload and manage file attachments across the platform', icon: 'Paperclip',      category: 'storage',      sort_order: 110 },
  { key: 'storage',              name: 'Storage & Buckets',      description: 'Manage cloud storage configurations and buckets',        icon: 'HardDrive',      category: 'storage',      sort_order: 120 },
  { key: 'security',             name: 'Security Policy',        description: 'Password policies, MFA and session security settings',   icon: 'Shield',         category: 'compliance',   sort_order: 130 },
  { key: 'billing',              name: 'License & Billing',      description: 'Subscription licenses and billing management',           icon: 'CreditCard',     category: 'management',   sort_order: 140 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Create platform_services table ─────────────────────────────────
    await queryInterface.createTable('platform_services', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique slug key used in middleware (e.g. document, capa, ai)',
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Lucide icon name for UI rendering',
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'quality | compliance | process | analytics | intelligence | integration | storage | management',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // ── 2. Create tenant_platform_services table ───────────────────────────
    await queryInterface.createTable('tenant_platform_services', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'platform_services', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional reason captured when enabling or disabling',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Unique: one row per tenant × service
    await queryInterface.addConstraint('tenant_platform_services', {
      fields: ['tenant_id', 'service_id'],
      type: 'unique',
      name: 'uq_tenant_platform_service',
    });

    // Indexes
    await queryInterface.addIndex('tenant_platform_services', ['tenant_id'], {
      name: 'idx_tps_tenant_id',
    });
    await queryInterface.addIndex('tenant_platform_services', ['tenant_id', 'service_id'], {
      name: 'idx_tps_tenant_service',
    });
    await queryInterface.addIndex('tenant_platform_services', ['tenant_id', 'is_enabled'], {
      name: 'idx_tps_tenant_enabled',
    });

    // ── 3. Seed platform_services rows ────────────────────────────────────
    for (const svc of SERVICES) {
      await queryInterface.sequelize.query(
        `INSERT INTO platform_services (key, name, description, icon, category, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (key) DO NOTHING`,
        { bind: [svc.key, svc.name, svc.description, svc.icon, svc.category, svc.sort_order] }
      );
    }

    // ── 4. Auto-provision all existing tenants ────────────────────────────
    // Every existing tenant gets every service enabled (is_enabled = true)
    await queryInterface.sequelize.query(`
      INSERT INTO tenant_platform_services (tenant_id, service_id, is_enabled, changed_at, created_at, updated_at)
      SELECT t.id, ps.id, true, NOW(), NOW(), NOW()
      FROM tenants t
      CROSS JOIN platform_services ps
      ON CONFLICT (tenant_id, service_id) DO NOTHING
    `);

    console.log('[Migration 109] platform_services and tenant_platform_services created.');
    console.log(`[Migration 109] ${SERVICES.length} platform services seeded.`);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('tenant_platform_services', 'idx_tps_tenant_enabled');
    await queryInterface.removeIndex('tenant_platform_services', 'idx_tps_tenant_service');
    await queryInterface.removeIndex('tenant_platform_services', 'idx_tps_tenant_id');
    await queryInterface.removeConstraint('tenant_platform_services', 'uq_tenant_platform_service');
    await queryInterface.dropTable('tenant_platform_services');
    await queryInterface.dropTable('platform_services');
  },
};
