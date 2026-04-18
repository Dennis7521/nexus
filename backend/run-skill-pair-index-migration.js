const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/nexus'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running skill_pair_index migration...');
    
    // Add skill_pair_index column if it doesn't exist
    await client.query(`
      ALTER TABLE sync_exchange_sessions
      ADD COLUMN IF NOT EXISTS skill_pair_index INTEGER;
    `);
    
    // Add index for efficient querying
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_sessions_skill_pair 
      ON sync_exchange_sessions(cycle_id, skill_pair_index);
    `);
    
    // Drop old constraint if exists
    await client.query(`
      ALTER TABLE sync_exchange_sessions
      DROP CONSTRAINT IF EXISTS sync_exchange_sessions_cycle_id_session_index_key;
    `);
    
    // Drop new constraint if exists (to avoid conflicts)
    await client.query(`
      ALTER TABLE sync_exchange_sessions
      DROP CONSTRAINT IF EXISTS sync_exchange_sessions_cycle_pair_index_unique;
    `);
    
    // Add new unique constraint
    await client.query(`
      ALTER TABLE sync_exchange_sessions
      ADD CONSTRAINT sync_exchange_sessions_cycle_pair_index_unique
      UNIQUE (cycle_id, skill_pair_index, session_index);
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('The skill_pair_index column has been added to sync_exchange_sessions table.');
    console.log('This will fix the "instructor can\'t end meeting" issue.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
