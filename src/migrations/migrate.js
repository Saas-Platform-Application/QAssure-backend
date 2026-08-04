require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

async function createMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function isMigrationApplied(version) {
  const [results] = await sequelize.query(
    'SELECT version FROM schema_migrations WHERE version = $1',
    { bind: [version] }
  );
  return results.length > 0;
}

async function markMigrationApplied(version) {
  await sequelize.query(
    'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
    { bind: [version] }
  );
}

async function markMigrationUndone(version) {
  await sequelize.query(
    'DELETE FROM schema_migrations WHERE version = $1',
    { bind: [version] }
  );
}

async function runMigrations() {
  const isUndo = process.argv.includes('--undo');
  console.log(isUndo ? 'Starting migration rollback...' : 'Starting database migrations...');

  const stats = { applied: 0, skipped: 0, failed: 0, failed_list: [] };

  try {
    await createMigrationsTable();
    console.log('Migration tracking table ready');

    const migrationsDir = __dirname;
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.match(/^\d{3}_.*\.js$/) && file !== 'migrate.js')
      .sort();

    if (isUndo) {
      for (const file of migrationFiles.reverse()) {
        if (await isMigrationApplied(file)) {
          console.log('Rolling back: ' + file);
          try {
            const migration = require(path.join(migrationsDir, file));
            if (migration.down) {
              await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize);
              await markMigrationUndone(file);
              console.log('Rolled back: ' + file);
            }
          } catch (error) {
            console.error('Rollback failed [' + file + ']: ' + error.message);
            stats.failed++;
            stats.failed_list.push(file);
          }
        }
      }
    } else {
      for (const file of migrationFiles) {
        if (await isMigrationApplied(file)) {
          console.log('Skipping (already applied): ' + file);
          stats.skipped++;
          continue;
        }

        console.log('Running: ' + file);
        try {
          const migration = require(path.join(migrationsDir, file));
          if (migration.up) {
            await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
            await markMigrationApplied(file);
            console.log('Applied: ' + file);
            stats.applied++;
          }
        } catch (error) {
          console.error('Failed [' + file + ']: ' + error.message);
          stats.failed++;
          stats.failed_list.push(file);
        }
      }
    }

    console.log('Summary: ' + stats.applied + ' applied | ' + stats.skipped + ' skipped | ' + stats.failed + ' failed');

    if (stats.failed_list.length > 0) {
      console.log('Failed migrations:');
      stats.failed_list.forEach(function(f) { console.log('  - ' + f); });
    }

    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Total tables in database: ' + tables.length);

  } catch (error) {
    console.error('Migration runner crashed: ' + error.message);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
