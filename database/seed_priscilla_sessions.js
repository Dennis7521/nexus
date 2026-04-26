/**
 * Seed script: bring the Mothusi (instructor) <-> Priscilla Botsheleng exchange
 * on "Intro to Artificial Intelligence" to 19 completed sessions.
 *
 * Current state  : 2 completed, 2 scheduled  (sessions 1-4 exist)
 * After this run : 19 completed               (sessions 1-19 complete)
 * Remaining      : session 20 – create manually to test the review flow
 *
 * Usage  :  node seed_priscilla_sessions.js
 * Safe to re-run: idempotent (ON CONFLICT DO NOTHING + status checks).
 */

const { Pool } = require('pg');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const isLocal = !process.env.DATABASE_URL
  || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host     : process.env.DB_HOST     || 'localhost',
      port     : process.env.DB_PORT     || 5432,
      database : process.env.DB_NAME     || 'nexus_db',
      user     : process.env.DB_USER     || 'postgres',
      password : process.env.DB_PASSWORD || 'password',
    });

const SESSION_TOPICS = [
  ['Course overview', 'History of AI', 'Intelligent agents'],               // 1
  ['Problem formulation', 'Uninformed search: BFS, DFS'],                    // 2
  ['Informed search: A*', 'Heuristic functions'],                            // 3
  ['Adversarial search', 'Minimax', 'Alpha-beta pruning'],                   // 4
  ['Propositional logic', 'First-order logic'],                              // 5
  ['Knowledge representation', 'Inference rules'],                           // 6
  ['Probability basics', 'Bayesian networks'],                               // 7
  ['Naive Bayes classifier', 'Probabilistic reasoning'],                     // 8
  ['Introduction to ML', 'Supervised vs unsupervised learning'],             // 9
  ['Linear regression', 'Gradient descent'],                                 // 10
  ['Logistic regression', 'Classification metrics'],                         // 11
  ['Decision trees', 'Random forests'],                                      // 12
  ['Support vector machines', 'Kernel functions'],                           // 13
  ['Unsupervised learning', 'K-means clustering'],                           // 14
  ['Dimensionality reduction', 'PCA'],                                       // 15
  ['Neural network basics', 'Perceptron model'],                             // 16
  ['Backpropagation', 'Activation functions'],                               // 17
  ['Ethics in AI', 'Bias, fairness, and responsibility'],                    // 18
  ['AI applications', 'Computer vision', 'NLP overview'],                    // 19
  ['Deep learning overview', 'CNNs and RNNs intro', 'Course wrap-up'],       // 20 – left for manual creation
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
    // ── 1. Find the exchange ──────────────────────────────────────────────────
    console.log('Locating exchange (Mothusi instructor + Priscilla learner, Intro to AI)...');

    let exRow;
    const precise = await client.query(
      `SELECT er.id, er.instructor_id, er.requester_id, er.status,
              er.session_count, er.total_credits, er.escrow_credits,
              s.title AS skill_title,
              ins.first_name || ' ' || ins.last_name AS instructor_name,
              req.first_name || ' ' || req.last_name AS learner_name
         FROM exchange_requests er
         JOIN users ins ON er.instructor_id = ins.id
         JOIN users req ON er.requester_id  = req.id
         JOIN skills s  ON er.skill_id      = s.id
        WHERE ins.first_name ILIKE 'Mothusi'
          AND req.first_name ILIKE 'Priscilla'
          AND s.title ILIKE '%intro%'
        ORDER BY er.created_at DESC
        LIMIT 1`
    );

    if (precise.rows.length === 0) {
      // Fallback: any exchange between the two users
      const fallback = await client.query(
        `SELECT er.id, er.instructor_id, er.requester_id, er.status,
                er.session_count, er.total_credits, er.escrow_credits,
                s.title AS skill_title,
                ins.first_name || ' ' || ins.last_name AS instructor_name,
                req.first_name || ' ' || req.last_name AS learner_name
           FROM exchange_requests er
           JOIN users ins ON er.instructor_id = ins.id
           JOIN users req ON er.requester_id  = req.id
           JOIN skills s  ON er.skill_id      = s.id
          WHERE ins.first_name ILIKE 'Mothusi'
            AND req.first_name ILIKE 'Priscilla'
          ORDER BY er.created_at DESC
          LIMIT 5`
      );

      if (fallback.rows.length === 0) {
        console.error('ERROR: No exchange found between Mothusi (instructor) and Priscilla (learner).');
        process.exit(1);
      }

      console.log('Exact "Intro" skill match not found. Nearest exchanges:');
      console.table(fallback.rows.map(r => ({
        id: r.id, skill: r.skill_title, status: r.status,
        sessions: r.session_count,
      })));
      exRow = fallback.rows[0];
    } else {
      exRow = precise.rows[0];
    }

    const { id: exchangeId, instructor_id, requester_id,
            session_count, total_credits, escrow_credits,
            skill_title, instructor_name, learner_name } = exRow;

    console.log(`\nExchange #${exchangeId}: "${skill_title}"`);
    console.log(`  Instructor : ${instructor_name}`);
    console.log(`  Learner    : ${learner_name}`);
    console.log(`  Status     : ${exRow.status}`);
    console.log(`  Sessions   : ${session_count}  |  total_credits: ${total_credits}  |  escrow: ${escrow_credits}`);

    const SEED_UP_TO   = session_count - 1;   // 19  (leave the last one for manual testing)
    const creditPerSes = Math.floor((parseFloat(total_credits) / session_count) * 1000) / 1000;
    console.log(`\nWill complete sessions 1-${SEED_UP_TO}  (${creditPerSes} credits each).`);
    console.log(`Session ${session_count} left for manual creation + review test.\n`);

    await client.query('BEGIN');

    // ── 2. Fetch all sessions that already exist ──────────────────────────────
    const existingQ = await client.query(
      `SELECT id, session_index, status, mentor_confirmed, learner_confirmed
         FROM exchange_sessions
        WHERE exchange_request_id = $1
        ORDER BY session_index`,
      [exchangeId]
    );

    const existingByIndex = {};
    for (const s of existingQ.rows) existingByIndex[s.session_index] = s;
    console.log(`Existing sessions in DB: ${existingQ.rows.length}`);

    let completedNow = 0;
    let creditsReleased = 0;

    // ── 3. Process indices 1 to SEED_UP_TO ───────────────────────────────────
    for (let i = 1; i <= SEED_UP_TO; i++) {
      const scheduled   = new Date(Date.now() - (SEED_UP_TO - i) * 7 * 24 * 60 * 60 * 1000);
      const started     = new Date(scheduled.getTime() + 2 * 60 * 1000);
      const ended       = new Date(started.getTime()   + 120 * 60 * 1000);
      const topics      = SESSION_TOPICS[i - 1];

      const existing = existingByIndex[i];

      if (existing) {
        // Already completed – skip
        if (existing.status === 'completed') {
          console.log(`  Session ${i}: already completed – skipped.`);
          continue;
        }

        // Exists but not completed – update it to completed and release credits
        await client.query(
          `UPDATE exchange_sessions
              SET mentor_confirmed        = TRUE,
                  mentor_confirmed_at     = $2,
                  learner_confirmed       = TRUE,
                  learner_confirmed_at    = $3,
                  mentor_joined_at        = COALESCE(mentor_joined_at,  $4),
                  learner_joined_at       = COALESCE(learner_joined_at, $5),
                  actual_started_at       = COALESCE(actual_started_at, $4),
                  actual_ended_at         = $2,
                  actual_duration_minutes = 120,
                  session_notes           = COALESCE(session_notes, 'Session completed successfully.'),
                  topics_covered          = COALESCE(topics_covered, $6),
                  status                  = 'completed',
                  completed_at            = $2
            WHERE id = $1`,
          [existing.id, ended, ended, started, new Date(started.getTime() + 60 * 1000), topics]
        );
        console.log(`  Session ${i}: was "${existing.status}" → marked completed.`);

      } else {
        // Does not exist – insert as completed
        const ins = await client.query(
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
             'completed', $11
           )
           ON CONFLICT (exchange_request_id, session_index) DO NOTHING
           RETURNING id`,
          [
            exchangeId, i,
            scheduled, creditPerSes,
            genCode(),
            ended, ended,
            started, new Date(started.getTime() + 60 * 1000),
            started, ended,
            'Session went well. Great progress made.',
            topics,
            `https://meet.jit.si/nexus-ai-${exchangeId}-session-${i}`,
          ]
        );

        if (ins.rows.length > 0) {
          console.log(`  Session ${i}: inserted as completed.`);
        } else {
          console.log(`  Session ${i}: conflict – already existed, skipped.`);
          continue;
        }
      }

      // Credit the instructor for this session
      await client.query(
        `INSERT INTO transactions (
           exchange_request_id, from_user_id, to_user_id,
           credits, transaction_type, description
         ) VALUES ($1, NULL, $2, $3, 'session_payment', $4)`,
        [exchangeId, instructor_id, creditPerSes,
         `Session ${i} payment – ${skill_title}`]
      );

      completedNow++;
      creditsReleased += creditPerSes;
    }

    // ── 4. Update instructor balance & escrow ─────────────────────────────────
    if (creditsReleased > 0) {
      await client.query(
        'UPDATE users SET time_credits = time_credits + $1 WHERE id = $2',
        [creditsReleased, instructor_id]
      );

      await client.query(
        'UPDATE exchange_requests SET escrow_credits = escrow_credits - $1, status = $2 WHERE id = $3',
        [creditsReleased, 'in_progress', exchangeId]
      );
    } else {
      // Even if 0 new sessions, ensure status is in_progress
      await client.query(
        `UPDATE exchange_requests SET status = 'in_progress' WHERE id = $1 AND status != 'completed'`,
        [exchangeId]
      );
    }

    await client.query('COMMIT');

    // ── 5. Summary ────────────────────────────────────────────────────────────
    const final = await client.query(
      `SELECT er.escrow_credits, er.status,
              COUNT(es.id) FILTER (WHERE es.status = 'completed') AS completed_count
         FROM exchange_requests er
         LEFT JOIN exchange_sessions es ON es.exchange_request_id = er.id
        WHERE er.id = $1
        GROUP BY er.escrow_credits, er.status`,
      [exchangeId]
    );
    const f = final.rows[0];

    console.log('\n──────────────────────────────────────────────');
    console.log(`Sessions newly completed : ${completedNow}`);
    console.log(`Credits released now     : ${creditsReleased.toFixed(3)}`);
    console.log(`Total completed sessions : ${f.completed_count} / ${session_count}`);
    console.log(`Escrow remaining         : ${parseFloat(f.escrow_credits).toFixed(3)}`);
    console.log(`Exchange status          : ${f.status}`);
    console.log('──────────────────────────────────────────────');
    console.log(`\nDone! Log in as Mothusi, open exchange #${exchangeId}, create session ${session_count},`);
    console.log('complete it, and the review prompt will appear.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
