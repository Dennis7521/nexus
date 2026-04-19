const cron = require('node-cron');
const { query } = require('../config/database');
const MatchingService = require('../services/MatchingService');
const GraphService = require('../services/GraphService');

// Track if a job is already running to prevent overlap
let asyncMatchJobRunning = false;
let cycleJobRunning = false;

// Cooldown for login-triggered jobs — prevents running on every concurrent login
let lastLoginTriggerAt = 0;
const LOGIN_TRIGGER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ─── Job Logger ───────────────────────────────────────────────────────────────

function log(jobName, level, message) {
  const ts = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '🔄';
  console.log(`[${ts}] [JOB:${jobName}] ${prefix} ${message}`);
}

// ─── Async Match Generation for All Users ────────────────────────────────────

async function generateAsyncMatchesForAllUsers() {
  if (asyncMatchJobRunning) {
    log('ASYNC_MATCHES', 'warn', 'Job already running, skipping...');
    return;
  }
  asyncMatchJobRunning = true;
  const startTime = Date.now();

  log('ASYNC_MATCHES', 'info', 'Starting async match generation for all users...');

  try {
    const usersResult = await query(
      `SELECT id, first_name, last_name, skills_interested_in
       FROM users
       WHERE is_active = TRUE
         AND email_verified = TRUE
         AND array_length(skills_interested_in, 1) > 0`
    );

    const users = usersResult.rows;
    log('ASYNC_MATCHES', 'info', `Found ${users.length} active users with interested skills`);

    let totalMatches = 0;
    let usersProcessed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const skills = user.skills_interested_in || [];
        let userMatchCount = 0;

        for (const skill of skills) {
          try {
            const matches = await MatchingService.findAsyncMatches(user.id, skill, { limit: 10 });
            userMatchCount += matches.length;
          } catch (skillErr) {
            log('ASYNC_MATCHES', 'warn', `  Skill "${skill}" for user ${user.id}: ${skillErr.message}`);
          }
        }

        totalMatches += userMatchCount;
        usersProcessed++;

        if (userMatchCount > 0) {
          log('ASYNC_MATCHES', 'info', `  User ${user.first_name} ${user.last_name}: ${userMatchCount} matches found across ${skills.length} skills`);
        }
      } catch (userErr) {
        errors++;
        log('ASYNC_MATCHES', 'error', `  User ${user.id}: ${userErr.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('ASYNC_MATCHES', 'success', `Completed in ${duration}s — ${usersProcessed}/${users.length} users processed, ${totalMatches} total matches, ${errors} errors`);
  } catch (err) {
    log('ASYNC_MATCHES', 'error', `Fatal error: ${err.message}`);
  } finally {
    asyncMatchJobRunning = false;
  }
}

// ─── Cycle Detection for All Users ───────────────────────────────────────────

async function detectCyclesForAllUsers() {
  if (cycleJobRunning) {
    log('CYCLE_DETECT', 'warn', 'Job already running, skipping...');
    return;
  }
  cycleJobRunning = true;
  const startTime = Date.now();

  log('CYCLE_DETECT', 'info', 'Starting cycle detection for all users...');

  try {
    // Clear graph cache so we use fresh data
    GraphService.clearCache();
    log('CYCLE_DETECT', 'info', 'Graph cache cleared');

    // Detect cycles (min 3 participants for multi-party)
    const scoredCycles = await MatchingService.findCycles({ maxLength: 5, minScore: 0 });
    const multiPartyCycles = scoredCycles.filter(({ cycle }) => cycle.length >= 3);

    log('CYCLE_DETECT', 'info', `Found ${scoredCycles.length} raw cycles, ${multiPartyCycles.length} multi-party (3+)`);

    if (multiPartyCycles.length === 0) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      log('CYCLE_DETECT', 'success', `Completed in ${duration}s — No new multi-party cycles to persist`);
      return;
    }

    // Remove cycles that already exist to avoid duplicates
    // Identify unique cycle participant sets
    const existingCyclesResult = await query(
      `SELECT ec.id, json_agg(cp.user_id ORDER BY cp.position_in_cycle) AS user_ids
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id
       WHERE ec.status IN ('proposed', 'pending')
       GROUP BY ec.id`
    );

    const existingKeys = new Set(
      existingCyclesResult.rows.map(row => {
        const sorted = [...row.user_ids].sort().join('-');
        return sorted;
      })
    );

    const newCycles = multiPartyCycles.filter(({ cycle }) => {
      const key = cycle.map(n => n.userId).sort().join('-');
      return !existingKeys.has(key);
    });

    log('CYCLE_DETECT', 'info', `${newCycles.length} new cycles to persist (${multiPartyCycles.length - newCycles.length} already exist)`);

    if (newCycles.length > 0) {
      const persistedIds = await MatchingService.persistCycles(newCycles);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      log('CYCLE_DETECT', 'success', `Completed in ${duration}s — Persisted ${persistedIds.length} new multi-party cycles`);
    } else {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      log('CYCLE_DETECT', 'success', `Completed in ${duration}s — All cycles already exist, nothing new to persist`);
    }
  } catch (err) {
    log('CYCLE_DETECT', 'error', `Fatal error: ${err.message}`);
    log('CYCLE_DETECT', 'error', err.stack);
  } finally {
    cycleJobRunning = false;
  }
}

// ─── Combined Job (run both) ──────────────────────────────────────────────────

async function runAllMatchingJobs() {
  log('ALL_JOBS', 'info', '=== Starting all matching jobs ===');
  await generateAsyncMatchesForAllUsers();
  await detectCyclesForAllUsers();
  log('ALL_JOBS', 'success', '=== All matching jobs complete ===');
}

// ─── Login Trigger (fire-and-forget) ─────────────────────────────────────────

function triggerMatchingJobsOnLogin() {
  const now = Date.now();
  if (now - lastLoginTriggerAt < LOGIN_TRIGGER_COOLDOWN_MS) {
    log('LOGIN_TRIGGER', 'info', 'Cooldown active — skipping login-triggered matching jobs');
    return;
  }
  lastLoginTriggerAt = now;
  setImmediate(async () => {
    log('LOGIN_TRIGGER', 'info', 'Login detected — triggering background matching jobs');
    await runAllMatchingJobs();
  });
}

// ─── Cron Scheduler ──────────────────────────────────────────────────────────

// ─── Cleanup Expired Data ─────────────────────────────────────────────────────

async function cleanupExpiredData() {
  try {
    // Delete expired OTP codes
    const otpResult = await query(`DELETE FROM otps WHERE expires_at < NOW()`);

    // Delete unverified accounts older than 24 hours (abandoned registrations)
    const userResult = await query(
      `DELETE FROM users
       WHERE email_verified = false
         AND is_active = true
         AND created_at < NOW() - INTERVAL '24 hours'`
    );

    log('CLEANUP', 'success',
      `Deleted ${otpResult.rowCount} expired OTPs and ${userResult.rowCount} stale unverified accounts`);
  } catch (err) {
    log('CLEANUP', 'error', `Cleanup error: ${err.message}`);
  }
}

function startScheduledJobs() {
  const jobEnabled = process.env.JOB_ENABLED !== 'false';
  if (!jobEnabled) {
    log('SCHEDULER', 'warn', 'Jobs disabled via JOB_ENABLED=false');
    return;
  }

  const matchesSchedule = process.env.JOB_SCHEDULE_MATCHES || '0 */6 * * *'; // every 6 hours
  const cyclesSchedule = process.env.JOB_SCHEDULE_CYCLES || '0 */6 * * *';   // every 6 hours
  const cleanupSchedule = '0 2 * * *'; // daily at 2 AM

  // Schedule async match generation
  cron.schedule(matchesSchedule, () => {
    log('SCHEDULER', 'info', `Scheduled async match job triggered (schedule: ${matchesSchedule})`);
    generateAsyncMatchesForAllUsers().catch(err =>
      log('SCHEDULER', 'error', `Async match cron error: ${err.message}`)
    );
  }, { timezone: 'Africa/Gaborone' });

  // Schedule cycle detection
  cron.schedule(cyclesSchedule, () => {
    log('SCHEDULER', 'info', `Scheduled cycle detection job triggered (schedule: ${cyclesSchedule})`);
    detectCyclesForAllUsers().catch(err =>
      log('SCHEDULER', 'error', `Cycle detection cron error: ${err.message}`)
    );
  }, { timezone: 'Africa/Gaborone' });

  // Schedule nightly cleanup
  cron.schedule(cleanupSchedule, () => {
    log('SCHEDULER', 'info', 'Nightly cleanup triggered');
    cleanupExpiredData().catch(err =>
      log('SCHEDULER', 'error', `Cleanup cron error: ${err.message}`)
    );
  }, { timezone: 'Africa/Gaborone' });

  log('SCHEDULER', 'success', `Scheduled jobs started:`);
  log('SCHEDULER', 'info', `  Async matches: ${matchesSchedule}`);
  log('SCHEDULER', 'info', `  Cycle detection: ${cyclesSchedule}`);
  log('SCHEDULER', 'info', `  Cleanup: ${cleanupSchedule}`);
}

module.exports = {
  generateAsyncMatchesForAllUsers,
  detectCyclesForAllUsers,
  runAllMatchingJobs,
  triggerMatchingJobsOnLogin,
  startScheduledJobs,
};
