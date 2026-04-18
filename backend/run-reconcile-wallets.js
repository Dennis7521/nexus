require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', 'reconcile_wallets.sql'),
    'utf8'
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(sql);
    await client.query('COMMIT');
    const counts = Array.isArray(r) ? r.map(x => x.rowCount) : [r.rowCount];
    console.log('✅ Wallet reconciliation complete. Row counts per statement:', counts);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reconciliation failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
