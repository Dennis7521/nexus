require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', 'normalize_escrow_ledger.sql'),
    'utf8'
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Ledger normalized. Result set info:', Array.isArray(r) ? r.map(x => x.rowCount) : r.rowCount);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
