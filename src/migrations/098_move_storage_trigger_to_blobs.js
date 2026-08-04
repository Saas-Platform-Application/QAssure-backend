'use strict';

/**
 * Migration 098: Move storage-usage accounting from file_attachments to file_blobs.
 * Physical bytes live once per blob, so quota must count blobs, not references.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      -- Remove the old per-attachment trigger.
      DROP TRIGGER IF EXISTS trg_update_storage_usage ON file_attachments;

      -- New function: count bytes per physical blob.
      CREATE OR REPLACE FUNCTION update_storage_usage_blob()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE storage_quotas
            SET used_storage_bytes = used_storage_bytes + NEW.file_size,
                file_count = file_count + 1,
                updated_at = NOW()
          WHERE tenant_id = NEW.tenant_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE storage_quotas
            SET used_storage_bytes = used_storage_bytes - OLD.file_size,
                file_count = file_count - 1,
                updated_at = NOW()
          WHERE tenant_id = OLD.tenant_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_update_storage_usage_blob ON file_blobs;
      CREATE TRIGGER trg_update_storage_usage_blob
        AFTER INSERT OR DELETE ON file_blobs
        FOR EACH ROW EXECUTE FUNCTION update_storage_usage_blob();
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_update_storage_usage_blob ON file_blobs;
      DROP FUNCTION IF EXISTS update_storage_usage_blob();

      -- Restore the original per-attachment trigger.
      CREATE OR REPLACE FUNCTION update_storage_usage()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE storage_quotas SET used_storage_bytes = used_storage_bytes + NEW.file_size,
            file_count = file_count + 1, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
          UPDATE storage_quotas SET used_storage_bytes = used_storage_bytes - OLD.file_size,
            file_count = file_count - 1, updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_update_storage_usage ON file_attachments;
      CREATE TRIGGER trg_update_storage_usage
        AFTER INSERT OR DELETE ON file_attachments
        FOR EACH ROW EXECUTE FUNCTION update_storage_usage();
    `);
  }
};
