const { Pool } = require('pg');
require('dotenv').config();

// Debug: Log environment variable status (remove after fix)
console.log('[DB CONFIG] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DB CONFIG] NODE_ENV:', process.env.NODE_ENV);

// Database connection configuration
// Support both DATABASE_URL (Railway/Prod) and individual vars (local)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for Railway PostgreSQL
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nexus_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 8000, // Return an error after 8 seconds if connection could not be established
    });

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('ERROR: Database connection error:', err);
  // Don't exit - let the pool recover from transient errors
  // In production, this should trigger an alert/monitoring notification
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only log queries in development (can leak sensitive data in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('ERROR: Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  getClient
};
