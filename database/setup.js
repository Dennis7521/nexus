const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function setupDatabase() {
  // First, connect to PostgreSQL without specifying a database to create the database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('Connecting to PostgreSQL...');
    
    // Check if database exists
    const dbCheckResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'nexus_db']
    );

    if (dbCheckResult.rows.length === 0) {
      console.log('Creating database...');
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'nexus_db'}`);
      console.log('Database created successfully');
    } else {
      console.log('Database already exists');
    }

    await adminPool.end();

    // Now connect to the actual database to run schema and seed
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'nexus_db'
    });

    // Try to enable pgcrypto for gen_random_uuid if available (non-fatal if it fails)
    try {
      await appPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      console.log('pgcrypto extension ensured.');
    } catch (extErr) {
      console.log('WARNING: Could not enable pgcrypto extension (non-fatal):', extErr.message);
    }

    // Detect if core tables already exist; if so, skip schema and seed
    const { rows: usersTableCheck } = await appPool.query(
      "SELECT to_regclass('public.users') AS exists;"
    );
    const usersTableExists = usersTableCheck[0] && usersTableCheck[0].exists !== null;

    if (!usersTableExists) {
      console.log('Running database schema...');
      const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await appPool.query(schemaSQL);
      console.log('Schema created successfully');
    } else {
      console.log('INFO: users table detected; skipping schema.sql application.');
    }

    if (!usersTableExists) {
      console.log('Seeding database with sample data...');
      const seedSQL = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
      await appPool.query(seedSQL);
      console.log('Database seeded successfully');
    } else {
      console.log('INFO: Existing data detected; skipping seed.sql.');
    }

    await appPool.end();
    console.log('Database setup completed!');
    
  } catch (error) {
    console.error('ERROR: Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\nNOTE: Make sure PostgreSQL is running on your system:');
      console.log('   - Windows: Check if PostgreSQL service is started');
      console.log('   - Or install PostgreSQL if not installed');
      console.log('   - Default credentials: username=postgres, password=password');
    }
    
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
