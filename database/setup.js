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
    console.log('🔗 Connecting to PostgreSQL...');
    
    // Check if database exists
    const dbCheckResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'nexus_db']
    );

    if (dbCheckResult.rows.length === 0) {
      console.log('📦 Creating database...');
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'nexus_db'}`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
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
      console.log('🔑 pgcrypto extension ensured.');
    } catch (extErr) {
      console.log('⚠️ Could not enable pgcrypto extension (non-fatal):', extErr.message);
    }

    // Detect if core tables already exist; if so, skip schema and seed
    const { rows: usersTableCheck } = await appPool.query(
      "SELECT to_regclass('public.users') AS exists;"
    );
    const usersTableExists = usersTableCheck[0] && usersTableCheck[0].exists !== null;

    if (!usersTableExists) {
      console.log('📋 Running database schema...');
      const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await appPool.query(schemaSQL);
      console.log('✅ Schema created successfully');
    } else {
      console.log('ℹ️ users table detected; skipping schema.sql application.');
    }

    // Apply SQL migrations from /database/migrations in alphabetical order
    console.log('🧱 Running migrations from /database/migrations ...');
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      let files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      // Ensure dependency order: exchange_cycles before cycle_participants
      const reorder = (arr, first, second) => {
        const i = arr.indexOf(first);
        const j = arr.indexOf(second);
        if (i !== -1 && j !== -1 && i > j) {
          // Move 'first' before 'second'
          arr.splice(i, 1);
          const newJ = arr.indexOf(second);
          arr.splice(newJ, 0, first);
        }
      };
      reorder(
        files,
        'create_exchange_cycles.sql',
        'create_cycle_participants.sql'
      );

      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`➡️  Applying migration: ${file}`);
        try {
          await appPool.query(sql);
        } catch (migErr) {
          // Postgres duplicate_object error code is 42710. Also catch common idempotency messages.
          const msg = (migErr && migErr.message) ? migErr.message : '';
          const isIdempotentIssue = migErr.code === '42710' || /already exists|duplicate|exists/i.test(msg);
          if (isIdempotentIssue) {
            console.log(`⚠️  Skipping idempotent migration error for ${file}: ${msg}`);
            continue;
          }
          throw migErr;
        }
      }
      console.log('✅ Migrations applied successfully');
    } else {
      console.log('ℹ️ No migrations directory found, skipping.');
    }

    if (!usersTableExists) {
      console.log('🌱 Seeding database with sample data...');
      const seedSQL = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
      await appPool.query(seedSQL);
      console.log('✅ Database seeded successfully');
    } else {
      console.log('ℹ️ Existing data detected; skipping seed.sql.');
    }

    await appPool.end();
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure PostgreSQL is running on your system:');
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
