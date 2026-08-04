/**
 * Database Configuration - QAssure Platform
 * Supports both Sequelize and raw SQL queries
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');

// Get database URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set in .env file');
  process.exit(1);
}

// Sequelize instance for migrations
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
  
});

// Raw pg Pool for direct queries
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
});

/**
 * Execute raw SQL query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log('[DB] Slow query:', { duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  return pool.connect();
}

/**
 * Execute transaction
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Cache for numeric collation support check
let numericCollationSupported = null;

/**
 * Check if the custom natural sort 'numeric' collation exists, and create it if possible.
 * Returns true if the collation exists/was created successfully, false otherwise.
 */
async function checkNumericCollation() {
  if (numericCollationSupported !== null) {
    return numericCollationSupported;
  }
  try {
    const checkRes = await pool.query("SELECT 1 FROM pg_collation WHERE collname = 'numeric'");
    if (checkRes.rows.length > 0) {
      numericCollationSupported = true;
    } else {
      await pool.query("CREATE COLLATION IF NOT EXISTS numeric (provider = icu, locale = 'en-u-kn-true')");
      numericCollationSupported = true;
      console.log('✅ Numeric collation created successfully');
    }
  } catch (error) {
    console.warn('⚠️ Could not check/create numeric collation, falling back to case-insensitive sorting:', error.message);
    numericCollationSupported = false;
  }
  return numericCollationSupported;
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ Database connected:', result.rows[0].now);
    // Ensure numeric collation is created on database startup
    await checkNumericCollation();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Close all connections
 */
async function close() {
  await pool.end();
  await sequelize.close();
  console.log('✅ Database connections closed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await close();
  process.exit(0);
});

module.exports = {
  sequelize,
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  checkNumericCollation,
  close
};
