/**
 * Cleanup: remove the 19 sessions inserted for exchange #4 and revert the exchange state
 * so the corrected seed_ai_sessions.js can be run (session_count=20, escrow=1, status=in_progress)
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const isLocal = !process.env.DATABASE_URL || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nexus_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get exchange #4 details
    const ex = await client.query(
      `SELECT id, instructor_id, requester_id, session_count, total_credits, escrow_credits, status
         FROM exchange_requests WHERE id = 4`
    );

    if (ex.rows.length === 0) {
      console.log('Exchange #4 not found. Nothing to clean up.');
      await client.query('ROLLBACK');
      return;
    }

    const exchange = ex.rows[0];
    console.log(`Exchange #4: session_count=${exchange.session_count}, total_credits=${exchange.total_credits}, escrow=${exchange.escrow_credits}, status=${exchange.status}`);

    // Count sessions to delete
    const sessionCount = await client.query(
      `SELECT COUNT(*) FROM exchange_sessions WHERE exchange_request_id = 4 AND session_index <= 19`
    );
    const count = parseInt(sessionCount.rows[0].count);
    console.log(`Found ${count} sessions (1-19) to delete`);

    if (count > 0) {
      // Delete sessions 1-19
      await client.query(
        `DELETE FROM exchange_sessions WHERE exchange_request_id = 4 AND session_index <= 19`
      );
      console.log(`Deleted ${count} sessions`);

      // Delete the associated transactions
      const txResult = await client.query(
        `DELETE FROM transactions 
         WHERE exchange_request_id = 4 AND transaction_type = 'session_payment'
         RETURNING id`
      );
      console.log(`Deleted ${txResult.rows.length} transactions`);

      // Revert instructor credits
      await client.query(
        `UPDATE users SET time_credits = time_credits - $1 WHERE id = $2`,
        [count, exchange.instructor_id]
      );
      console.log(`Reverted ${count} credits from instructor`);
    }

    // Reset exchange to proper state for the corrected seed
    await client.query(
      `UPDATE exchange_requests
          SET session_count  = 20,
              total_credits  = 20,
              escrow_credits = 1,
              status         = 'in_progress',
              updated_at     = NOW()
        WHERE id = 4`
    );
    console.log('Reset exchange: session_count=20, total_credits=20, escrow=1, status=in_progress');

    await client.query('COMMIT');
    console.log('Cleanup complete. Now run: node seed_ai_sessions.js');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
