const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running cycle_reviews migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_cycle_reviews.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ cycle_reviews migration completed successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - cycle_reviews table');
    console.log('  - Indexes for performance');
    console.log('  - Triggers to update user ratings from both review types');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
