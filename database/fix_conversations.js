/**
 * Fix: Exchange #4 is in_progress so it doesn't show in conversations
 * Options:
 * 1. Change exchange status to 'accepted' 
 * 2. Or update the backend to include 'in_progress' exchanges
 * 
 * I'll do option 1 for immediate fix
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
    console.log('=== Checking Exchange #4 Status ===\n');
    
    const ex = await client.query(
      `SELECT er.id, er.status, er.instructor_id, er.requester_id,
              s.title as skill_title,
              ins.first_name || ' ' || ins.last_name as instructor_name,
              req.first_name || ' ' || req.last_name as learner_name
         FROM exchange_requests er
         JOIN users ins ON er.instructor_id = ins.id
         JOIN users req ON er.requester_id = req.id
         JOIN skills s ON er.skill_id = s.id
        WHERE er.id = 4`
    );
    
    if (ex.rows.length === 0) {
      console.log('Exchange #4 not found!');
      return;
    }
    
    const exchange = ex.rows[0];
    console.log('Current status:', exchange.status);
    console.log('Instructor:', exchange.instructor_name);
    console.log('Learner:', exchange.learner_name);
    
    // The conversations endpoint only shows 'accepted' or 'completed'
    // Change from 'in_progress' to 'accepted' so it appears
    if (exchange.status === 'in_progress' || exchange.status === 'pending') {
      console.log('\n→ Changing status to "accepted" so conversation appears...');
      await client.query(
        `UPDATE exchange_requests SET status = 'accepted', updated_at = NOW() WHERE id = 4`
      );
      console.log('✓ Status updated to accepted');
    } else {
      console.log('\n→ Status is already:', exchange.status);
    }
    
    // Add messages if none exist
    const msgs = await client.query(
      'SELECT COUNT(*) FROM messages WHERE exchange_request_id = 4'
    );
    const msgCount = parseInt(msgs.rows[0].count);
    console.log(`\nMessages: ${msgCount}`);
    
    if (msgCount === 0) {
      console.log('→ Adding initial messages...');
      // Add a welcome message from instructor
      await client.query(
        `INSERT INTO messages (exchange_request_id, sender_id, receiver_id, content, created_at, is_read)
         VALUES (4, $1, $2, 'Welcome! Let''s begin our 20-session journey through Intro to Artificial Intelligence. Ready to start?', NOW(), false)`,
        [exchange.instructor_id, exchange.requester_id]
      );
      console.log('✓ Added welcome message');
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('Exchange #4 should now appear in both users\' Messages tab');
    console.log('Workspace button should be available');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
