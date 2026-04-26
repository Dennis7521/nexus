/**
 * Seed 19 completed sessions for the existing Fatima <-> Mothusi exchange
 * on "Intro to Artificial Intelligence", then mark the exchange as completed
 * so the learner (Mothusi) can submit a review.
 *
 * Usage:
 *   node seed_ai_sessions.js
 *
 * Safe to re-run: uses ON CONFLICT for sessions and idempotent updates.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const isLocal = !process.env.DATABASE_URL
  || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nexus_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

const SESSION_TOPICS = [
  ['Course overview', 'History of AI', 'Intelligent agents'],
  ['Problem formulation', 'Uninformed search: BFS, DFS'],
  ['Informed search: A*', 'Heuristic functions'],
  ['Adversarial search', 'Minimax', 'Alpha-beta pruning'],
  ['Propositional logic', 'First-order logic'],
  ['Knowledge representation', 'Inference rules'],
  ['Probability basics', 'Bayesian networks'],
  ['Naive Bayes classifier', 'Probabilistic reasoning'],
  ['Introduction to ML', 'Supervised vs unsupervised learning'],
  ['Linear regression', 'Gradient descent'],
  ['Logistic regression', 'Classification metrics'],
  ['Decision trees', 'Random forests'],
  ['Support vector machines', 'Kernel functions'],
  ['Unsupervised learning', 'K-means clustering'],
  ['Dimensionality reduction', 'PCA'],
  ['Neural network basics', 'Perceptron model'],
  ['Backpropagation', 'Activation functions'],
  ['Deep learning overview', 'CNNs and RNNs intro'],
  ['Ethics in AI', 'Bias and fairness', 'Course wrap-up'],
];

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 11; i++) {
    code += (i === 3 || i === 7) ? '-' : chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

(async () => {
  const client = await pool.connect();
  try {
    // ── 1. Locate the exchange ────────────────────────────────────────────────
    console.log('Locating exchange (Mothusi instructor, Fatima learner, "Intro to Artificial Intelligence")...');
    const exchangeQ = await client.query(
      `SELECT er.id, er.instructor_id, er.requester_id, er.status,
              er.session_count, er.total_credits, er.escrow_credits,
              s.title AS skill_title,
              ins.first_name AS instructor_first, ins.last_name AS instructor_last,
              req.first_name AS learner_first,    req.last_name AS learner_last
         FROM exchange_requests er
         JOIN users ins ON er.instructor_id = ins.id
         JOIN users req ON er.requester_id  = req.id
         JOIN skills s  ON er.skill_id      = s.id
        WHERE ins.first_name ILIKE 'Mothusi'
          AND req.first_name ILIKE 'Fatima'
          AND s.title ILIKE '%artificial intelligence%'
        ORDER BY er.created_at DESC
        LIMIT 1`
    );

    if (exchangeQ.rows.length === 0) {
      // Broader fallback: any exchange between users with those first names
      const fallback = await client.query(
        `SELECT er.id, er.instructor_id, er.requester_id, er.status,
                er.session_count, er.total_credits, er.escrow_credits,
                s.title AS skill_title,
                ins.first_name AS instructor_first, ins.last_name AS instructor_last,
                req.first_name AS learner_first,    req.last_name AS learner_last
           FROM exchange_requests er
           JOIN users ins ON er.instructor_id = ins.id
           JOIN users req ON er.requester_id  = req.id
           JOIN skills s  ON er.skill_id      = s.id
          WHERE (ins.first_name ILIKE 'Mothusi' AND req.first_name ILIKE 'Fatima')
             OR (ins.first_name ILIKE 'Fatima'  AND req.first_name ILIKE 'Mothusi')
          ORDER BY er.created_at DESC
          LIMIT 5`
      );
      console.error('No match for AI skill. Nearby exchanges between those users:');
      console.table(fallback.rows);
      process.exit(1);
    }

    const ex = exchangeQ.rows[0];
    console.log(`Found exchange #${ex.id}: "${ex.skill_title}"`);
    console.log(`   Instructor: ${ex.instructor_first} ${ex.instructor_last}`);
    console.log(`   Learner:    ${ex.learner_first} ${ex.learner_last}`);
    console.log(`   Status: ${ex.status}  |  sessions: ${ex.session_count}  |  total_credits: ${ex.total_credits}  |  escrow: ${ex.escrow_credits}`);

    // ── 2. Update exchange: keep session_count=20, set total_credits=3, escrow=0.15 (for 20th session), status=in_progress
    const creditPerSession = 3.0 / 20; // 0.15 credits per session
    await client.query('BEGIN');
    await client.query(
      `UPDATE exchange_requests
          SET session_count  = 20,
              total_credits  = 3,
              escrow_credits = $2,
              status         = 'in_progress',
              updated_at     = NOW()
        WHERE id = $1`,
      [ex.id, creditPerSession]
    );
    console.log(`Exchange updated: session_count=20, total_credits=3, escrow=${creditPerSession}, status=in_progress`);

    // ── 3. Insert 19 completed sessions (idempotent) ──────────────────────────
    let inserted = 0;
    for (let i = 1; i <= 19; i++) {
      const scheduled = new Date(Date.now() - (19 - i) * 7 * 24 * 60 * 60 * 1000);
      const started   = new Date(scheduled.getTime() + 2 * 60 * 1000);
      const ended     = new Date(started.getTime() + 120 * 60 * 1000);

      const result = await client.query(
        `INSERT INTO exchange_sessions (
           exchange_request_id, session_index,
           scheduled_at, duration_minutes, credit_share,
           verification_code, code_attempts,
           mentor_confirmed, mentor_confirmed_at,
           learner_confirmed, learner_confirmed_at,
           mentor_joined_at, learner_joined_at,
           actual_started_at, actual_ended_at, actual_duration_minutes,
           session_notes, topics_covered, meeting_link,
           status, completed_at
         ) VALUES (
           $1, $2,
           $3, 120, $4,
           $5, 0,
           TRUE, $6,
           TRUE, $7,
           $8, $9,
           $10, $11, 120,
           $12, $13, $14,
           'completed', $15
         )
         ON CONFLICT (exchange_request_id, session_index) DO NOTHING
         RETURNING id`,
        [
          ex.id, i,
          scheduled,
          creditPerSession,
          genCode(),
          new Date(ended.getTime() - 60 * 1000),
          ended,
          started, new Date(started.getTime() + 60 * 1000),
          started, ended,
          'Session went well. Student showed good understanding.',
          SESSION_TOPICS[i - 1],
          `https://meet.jit.si/nexus-ai-intro-fatima-mothusi-${i}`,
          ended,
        ]
      );

      if (result.rows.length > 0) {
        inserted++;
        // Credit transaction: platform escrow -> instructor (0.15 credits per session)
        await client.query(
          `INSERT INTO transactions (
             exchange_request_id, from_user_id, to_user_id,
             credits, transaction_type, description
           ) VALUES ($1, NULL, $2, $3, 'session_payment', $4)`,
          [ex.id, ex.instructor_id, creditPerSession, `Session ${i} payment - Intro to Artificial Intelligence`]
        );
      }
    }
    console.log(`Inserted ${inserted} new sessions (skipped ${19 - inserted} existing).`);

    // ── 4. Credit instructor for newly inserted sessions only ─────────────────────
    if (inserted > 0) {
      const creditsToAward = inserted * creditPerSession;
      await client.query(
        `UPDATE users SET time_credits = time_credits + $1 WHERE id = $2`,
        [creditsToAward, ex.instructor_id]
      );
      console.log(`Credited ${creditsToAward.toFixed(2)} time_credits to instructor.`);
    }

    await client.query('COMMIT');
    console.log('Done. Mothusi can now open the exchange and submit a review.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
