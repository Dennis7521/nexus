/**
 * Run database migrations manually
 * Usage: node run_migrations.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const { runStartupMigrations } = require('../backend/config/migrations');

(async () => {
  console.log('Running migrations...\n');
  await runStartupMigrations();
  console.log('\nDone!');
  process.exit(0);
})();
