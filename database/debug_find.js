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
  console.log('\n== Users matching Fatima/Mothusi ==');
  const u = await pool.query(
    `SELECT id, student_id, first_name, last_name, email
       FROM users
      WHERE first_name ILIKE '%fatima%' OR last_name ILIKE '%fatima%'
         OR first_name ILIKE '%mothusi%' OR last_name ILIKE '%mothusi%'`
  );
  console.table(u.rows);

  console.log('\n== Skills with "artificial intelligence" or "AI" ==');
  const s = await pool.query(
    `SELECT s.id, s.title, s.user_id, u.first_name, u.last_name
       FROM skills s JOIN users u ON s.user_id = u.id
      WHERE s.title ILIKE '%artificial intelligence%' OR s.title ILIKE '%intro to AI%'`
  );
  console.table(s.rows);

  console.log('\n== All exchange_requests where Mothusi is instructor ==');
  const e = await pool.query(
    `SELECT er.id, er.status, er.session_count, er.total_credits, er.escrow_credits,
            sk.title AS skill_title,
            ins.first_name || ' ' || ins.last_name AS instructor,
            req.first_name || ' ' || req.last_name AS learner,
            er.created_at
       FROM exchange_requests er
       JOIN users ins ON er.instructor_id = ins.id
       JOIN users req ON er.requester_id  = req.id
       JOIN skills sk ON er.skill_id = sk.id
      WHERE ins.first_name ILIKE '%mothusi%'
      ORDER BY er.created_at DESC`
  );
  console.table(e.rows);

  console.log('\n== Skills owned by Mothusi ==');
  const sk = await pool.query(
    `SELECT s.id, s.title, s.category, s.credits_required
       FROM skills s JOIN users u ON s.user_id = u.id
      WHERE u.first_name ILIKE '%mothusi%'`
  );
  console.table(sk.rows);

  await pool.end();
})();
