/**
 * Runs migrations/backfill_opening_balance.sql
 *
 * Usage: node run-backfill-opening-balance.js
 *
 * Adds a single `opening_balance` transaction for any user whose current
 * wallet (time_credits) does not match the signed sum of their existing
 * ledger entries. Idempotent — re-runs insert nothing.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', 'backfill_opening_balance.sql'),
    'utf8'
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Backfill complete. Rows inserted: ${result.rowCount ?? 0}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Backfill failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
