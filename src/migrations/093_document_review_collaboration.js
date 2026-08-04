'use strict';

/**
 * Migration 093 - Document Review Collaboration
 *
 * Adds:
 * 1. source_record_id column to documents table
 * 2. document_sections table (structured sections with per-section review state)
 * 3. document_comments table (section-level and document-level threaded comments)
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // =========================================================================
    // 1. Add source_record_id to documents
    //    This is the specific record ID within the source application
    //    (e.g. "Report_ID_001"), distinct from source_module_id (module UUID).
    // =========================================================================
    await queryInterface.sequelize.query(`
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS source_record_id TEXT;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source_record
        ON documents(tenant_id, source_module_id, source_record_id)
        WHERE source_record_id IS NOT NULL;
    `);

    // =========================================================================
    // 2. document_sections table
    //    Holds structured sections / subsections for a document version.
    //    review_status tracks per-section reviewer state.
    // =========================================================================
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_sections (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_id     UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

        section_number VARCHAR(20),           -- e.g. "1", "1.1", "2.3"
        title          VARCHAR(500),
        content        TEXT,
        content_html   TEXT,
        order_index    INTEGER DEFAULT 0,
        parent_id      UUID REFERENCES document_sections(id),

        -- Per-section review state (set by the current workflow step assignee)
        review_status  VARCHAR(50) DEFAULT 'pending',  -- pending | reviewed | rework
        reviewed_by    UUID REFERENCES users(id),
        reviewed_at    TIMESTAMPTZ,

        -- If TRUE this section must be marked reviewed before the assignee
        -- can transition the workflow task to the next step.
        is_mandatory   BOOLEAN DEFAULT TRUE,

        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_sections_document
        ON document_sections(document_id);

      CREATE INDEX IF NOT EXISTS idx_doc_sections_version
        ON document_sections(version_id);

      CREATE INDEX IF NOT EXISTS idx_doc_sections_parent
        ON document_sections(parent_id)
        WHERE parent_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_doc_sections_review
        ON document_sections(document_id, review_status, is_mandatory);
    `);

    // =========================================================================
    // 3. document_comments table
    //    When section_id is NULL  → document-level comment.
    //    When section_id is set   → section-level comment.
    //    workflow_step stores the step name at the time the comment was made
    //    (purely informational — pulled from workflow_steps.name).
    // =========================================================================
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_comments (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        section_id    UUID REFERENCES document_sections(id) ON DELETE CASCADE,
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

        comment_text  TEXT NOT NULL,
        authored_by   UUID NOT NULL REFERENCES users(id),

        -- Informational: which workflow step name was active when commented
        workflow_step VARCHAR(255),

        -- Resolution tracking
        status        VARCHAR(50) DEFAULT 'open',  -- open | resolved
        resolved_by   UUID REFERENCES users(id),
        resolved_at   TIMESTAMPTZ,

        -- Threaded replies (parent_id NULL = root comment)
        parent_id     UUID REFERENCES document_comments(id) ON DELETE CASCADE,

        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_comments_document
        ON document_comments(document_id);

      CREATE INDEX IF NOT EXISTS idx_doc_comments_section
        ON document_comments(section_id)
        WHERE section_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_doc_comments_status
        ON document_comments(document_id, status);
    `);

    console.log('Migration 093: document_sections, document_comments tables created; source_record_id added to documents.');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS document_comments;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS document_sections;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_documents_source_record;`);
    await queryInterface.sequelize.query(`
      ALTER TABLE documents DROP COLUMN IF EXISTS source_record_id;
    `);
    console.log('Migration 093: rolled back.');
  }
};
