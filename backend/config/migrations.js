const { query } = require('./database');

// Idempotent migrations applied on server startup.
// Each entry must be safe to run repeatedly (use IF NOT EXISTS / IF EXISTS).
const migrations = [
  {
    name: 'add_meeting_ended_to_sync_exchange_sessions',
    sql: `
      ALTER TABLE sync_exchange_sessions
        ADD COLUMN IF NOT EXISTS meeting_ended BOOLEAN NOT NULL DEFAULT FALSE;
      UPDATE sync_exchange_sessions
        SET meeting_ended = TRUE
        WHERE status = 'completed' AND meeting_ended = FALSE;
    `,
  },
];

async function runStartupMigrations() {
  for (const m of migrations) {
    try {
      await query(m.sql);
      console.log(`✓ migration applied: ${m.name}`);
    } catch (err) {
      console.error(`✗ migration failed: ${m.name}:`, err.message);
    }
  }
}

module.exports = { runStartupMigrations };
