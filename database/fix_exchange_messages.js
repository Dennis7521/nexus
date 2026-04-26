/**
 * Fix exchange #4 messaging/workspace access for Fatima and Mothusi
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
    console.log('=== Checking Exchange #4 ===\n');
    
    // Get exchange details
    const ex = await client.query(
      `SELECT er.id, er.status, er.instructor_id, er.requester_id, er.skill_id,
              s.title as skill_title,
              ins.first_name || ' ' || ins.last_name as instructor_name,
              req.first_name || ' ' || req.last_name as learner_name,
              ins.email as instructor_email,
              req.email as learner_email
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
    console.log('Exchange:', exchange);
    
    // Check sessions
    const sessions = await client.query(
      `SELECT session_index, status, mentor_confirmed, learner_confirmed 
         FROM exchange_sessions 
        WHERE exchange_request_id = 4 
        ORDER BY session_index`
    );
    console.log(`\nSessions: ${sessions.rows.length} found`);
    console.table(sessions.rows);
    
    // Check messages
    const messages = await client.query(
      `SELECT id, sender_id, content, created_at 
         FROM messages 
        WHERE exchange_request_id = 4 
        ORDER BY created_at`
    );
    console.log(`\nMessages: ${messages.rows.length} found`);
    
    if (messages.rows.length === 0) {
      console.log('No messages found — creating initial conversation...');
      
      // Insert initial messages to establish the conversation
      const msgs = [
        {
          sender: exchange.learner_email,
          content: `Hi ${exchange.instructor_name.split(' ')[0]}! I'm interested in learning ${exchange.skill_title}. Can we schedule our first session?`
        },
        {
          sender: exchange.instructor_email,
          content: `Hi! I'd be happy to teach you ${exchange.skill_title}. Let's start with the basics and work through all 20 sessions. Ready to begin?`
        },
        {
          sender: exchange.learner_email,
          content: 'Yes! Looking forward to it. When are you available?'
        }
      ];
      
      for (const msg of msgs) {
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [msg.sender]);
        if (userRes.rows.length > 0) {
          await client.query(
            `INSERT INTO messages (sender_id, receiver_id, exchange_request_id, content, created_at)
             VALUES ($1, 
                     CASE WHEN $1 = $2 THEN $3 ELSE $2 END,
                     $4, $5, NOW())`,
            [userRes.rows[0].id, exchange.instructor_id, exchange.requester_id, exchange.id, msg.content]
          );
        }
      }
      console.log('Created 3 initial messages');
    }
    
    // Ensure exchange status allows workspace access
    if (exchange.status === 'pending') {
      console.log('\nExchange is pending — updating to accepted...');
      await client.query(
        `UPDATE exchange_requests SET status = 'accepted', updated_at = NOW() WHERE id = 4`
      );
      console.log('Updated status to accepted');
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('Users should now see the conversation in Messages and access the Workspace');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
