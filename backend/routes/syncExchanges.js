const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query, getClient } = require('../config/database');
const { generateJitsiRoom } = require('../utils/jitsi');
const MatchingService = require('../services/MatchingService');

function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) code += '-';
    else code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/sync-exchanges/active - Check if user has an active sync exchange
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.active_sync_exchange_id,
              ec.cycle_length, ec.cycle_score, ec.status, ec.session_count,
              ec.current_session_index, ec.cycle_data, ec.created_at
       FROM users u
       LEFT JOIN exchange_cycles ec ON ec.id = u.active_sync_exchange_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const row = result.rows[0];
    if (!row || !row.active_sync_exchange_id) {
      return res.json({ active: false });
    }
    res.json({ active: true, cycleId: row.active_sync_exchange_id, cycle: row });
  } catch (err) {
    console.error('GET /sync-exchanges/active error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sync-exchanges/cycles/my - Get pending sync cycle proposals for current user
router.get('/cycles/my', authenticateToken, async (req, res) => {
  try {
    const status = req.query.status || 'proposed';
    const result = await query(
      `SELECT ec.id, ec.cycle_data, ec.cycle_length, ec.cycle_score, ec.status,
              ec.session_count, ec.current_session_index, ec.created_at,
              ec.accepted_count, ec.total_participants,
              cp.position_in_cycle, cp.skill_offering AS teach_skill,
              cp.skill_receiving AS learn_skill, cp.status AS acceptance_status
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id
       WHERE cp.user_id = $1
         AND ec.status = $2
         AND ec.cycle_length >= 3
         AND ec.exchange_mode = 'sync'
       ORDER BY ec.cycle_score DESC, ec.created_at DESC`,
      [req.user.id, status]
    );

    // Filter out proposed cycles that are duplicates of completed cycles
    const filteredRows = [];
    for (const cycle of result.rows) {
      // Only filter proposed cycles (not completed ones)
      if (status === 'proposed') {
        const participants = cycle.cycle_data?.participants || [];
        if (participants.length > 0) {
          const isDuplicate = await MatchingService.hasCompletedCycle(participants);
          if (isDuplicate) {
            console.log(`🔄 Filtering proposed cycle ${cycle.id}: same participants already completed a cycle`);
            continue;
          }
        }
      }
      filteredRows.push(cycle);
    }

    const enriched = await Promise.all(filteredRows.map(async (cycle) => {
      const participants = cycle.cycle_data?.participants || [];
      if (participants.length > 0) {
        const userIds = participants.map(p => p.userId);
        const usersRes = await query(
          `SELECT id, first_name, last_name, profile_picture_url FROM users WHERE id = ANY($1)`,
          [userIds]
        );
        const userMap = {};
        usersRes.rows.forEach(u => {
          userMap[u.id] = {
            name: `${u.first_name} ${u.last_name}`,
            picture: u.profile_picture_url
          };
        });
        cycle.cycle_data.participants = participants.map(p => ({
          ...p,
          name: userMap[p.userId]?.name || 'Unknown',
          picture: userMap[p.userId]?.picture || null
        }));
      }
      return cycle;
    }));

    res.json({ cycles: enriched, total: enriched.length });
  } catch (err) {
    console.error('GET /sync-exchanges/cycles/my error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/cycles/:cycleId/respond - Accept or reject a cycle
router.post('/cycles/:cycleId/respond', authenticateToken, async (req, res) => {
  const { cycleId } = req.params;
  const { accept } = req.body;
  const userId = req.user.id;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify cycle exists and user is a participant
    const cycleCheck = await client.query(
      `SELECT ec.id, ec.exchange_mode, ec.total_participants
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.id = $2 AND ec.status = 'proposed'`,
      [userId, cycleId]
    );
    if (cycleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cycle not found or already responded' });
    }

    // If accepting, check one-at-a-time constraint
    if (accept) {
      const activeCheck = await client.query(
        `SELECT active_sync_exchange_id FROM users WHERE id = $1`,
        [userId]
      );
      if (activeCheck.rows[0]?.active_sync_exchange_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'You are already in an active sync exchange. Complete it before joining another.',
          activeExchangeId: activeCheck.rows[0].active_sync_exchange_id
        });
      }
    }

    const newStatus = accept ? 'accepted' : 'rejected';
    await client.query(
      `UPDATE cycle_participants SET status = $1, responded_at = NOW()
       WHERE cycle_id = $2 AND user_id = $3`,
      [newStatus, cycleId, userId]
    );

    // Check aggregate status
    const participantsRes = await client.query(
      `SELECT status FROM cycle_participants WHERE cycle_id = $1`,
      [cycleId]
    );
    const allAccepted = participantsRes.rows.every(p => p.status === 'accepted');
    const anyRejected = participantsRes.rows.some(p => p.status === 'rejected');

    let cycleStatus = 'proposed';
    if (anyRejected) cycleStatus = 'rejected';
    else if (allAccepted) cycleStatus = 'active';

    await client.query(
      `UPDATE exchange_cycles SET status = $1, updated_at = NOW() WHERE id = $2`,
      [cycleStatus, cycleId]
    );

    // If now active, set active_sync_exchange_id on all participants and seed group chat
    if (cycleStatus === 'active') {
      await client.query(
        `UPDATE users SET active_sync_exchange_id = $1
         WHERE id IN (SELECT user_id FROM cycle_participants WHERE cycle_id = $2)`,
        [cycleId, cycleId]
      );

      // Seed the group chat with an intro system message from the activating user
      const participantsRes = await client.query(
        `SELECT u.first_name, u.last_name FROM users u
         JOIN cycle_participants cp ON cp.user_id = u.id
         WHERE cp.cycle_id = $1 ORDER BY cp.position_in_cycle ASC`,
        [cycleId]
      );
      const names = participantsRes.rows.map(r => r.first_name).join(', ');
      const introMsg = `🎉 ${names} — welcome to your sync exchange group chat! Everyone has accepted. You can now coordinate your sessions here and access your workspace.`;

      await client.query(
        `INSERT INTO messages (sender_id, receiver_id, cycle_id, content, created_at)
         VALUES ($1, $1, $2, $3, NOW())`,
        [userId, cycleId, introMsg]
      );
    }

    await client.query('COMMIT');
    res.json({ message: accept ? 'Cycle accepted' : 'Cycle declined', cycleStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /sync-exchanges/cycles/:id/respond error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync-exchanges/:cycleId/set-session-count - Set session count (once, when cycle goes active)
router.post('/:cycleId/set-session-count', authenticateToken, async (req, res) => {
  const { cycleId } = req.params;
  const userId = req.user.id;
  const { sessionCount } = req.body;

  if (!sessionCount || sessionCount < 1 || sessionCount > 50) {
    return res.status(400).json({ message: 'Session count must be between 1 and 50' });
  }

  try {
    // Verify user is a participant and cycle is active with session_count not yet set (still default 0 or null)
    const check = await query(
      `SELECT ec.id, ec.session_count, ec.status
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.id = $2 AND ec.status = 'active'`,
      [userId, cycleId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Active cycle not found or access denied' });
    }
    if (check.rows[0].session_count > 0) {
      return res.status(409).json({ message: 'Session count has already been set' });
    }

    await query(
      `UPDATE exchange_cycles SET session_count = $1 WHERE id = $2`,
      [sessionCount, cycleId]
    );

    res.json({ message: 'Session count set', sessionCount });
  } catch (err) {
    console.error('POST /sync-exchanges/:id/set-session-count error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/:cycleId/set-pair-session-count - Instructor sets session count for their pair
router.post('/:cycleId/set-pair-session-count', authenticateToken, async (req, res) => {
  const { cycleId } = req.params;
  const userId = req.user.id;
  const { pairIndex, sessionCount } = req.body;

  if (pairIndex === undefined || pairIndex === null) {
    return res.status(400).json({ message: 'pairIndex is required' });
  }
  if (!sessionCount || sessionCount < 1 || sessionCount > 50) {
    return res.status(400).json({ message: 'Session count must be between 1 and 50' });
  }

  try {
    // Verify user is the teacher of this pair (position_in_cycle === pairIndex)
    const check = await query(
      `SELECT cp.position_in_cycle, ec.status, ec.pair_session_counts
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.id = $2 AND ec.status = 'active'`,
      [userId, cycleId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Active cycle not found or access denied' });
    }
    if (check.rows[0].position_in_cycle !== pairIndex) {
      return res.status(403).json({ message: 'Only the instructor of this skill pair can set its session count' });
    }

    const existing = check.rows[0].pair_session_counts || {};
    const updated = { ...existing, [pairIndex]: sessionCount };

    await query(
      `UPDATE exchange_cycles SET pair_session_counts = $1 WHERE id = $2`,
      [JSON.stringify(updated), cycleId]
    );

    res.json({ message: 'Pair session count set', pairIndex, sessionCount, pair_session_counts: updated });
  } catch (err) {
    console.error('POST /sync-exchanges/:id/set-pair-session-count error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sync-exchanges/:cycleId/workspace - Full workspace data
router.get('/:cycleId/workspace', authenticateToken, async (req, res) => {
  const { cycleId } = req.params;
  const userId = req.user.id;
  try {
    // Verify user is participant
    const cycleRes = await query(
      `SELECT ec.*, cp.skill_offering AS my_teach_skill, cp.skill_receiving AS my_learn_skill,
              cp.position_in_cycle AS my_position, cp.status AS my_acceptance_status
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.id = $2`,
      [userId, cycleId]
    );
    if (cycleRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exchange not found or access denied' });
    }
    const cycle = cycleRes.rows[0];

    // Get all participants with user info
    const participantsRes = await query(
      `SELECT cp.*, u.first_name, u.last_name, u.email, u.profile_picture_url,
              u.total_rating, u.rating_count
       FROM cycle_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.cycle_id = $1
       ORDER BY cp.position_in_cycle ASC`,
      [cycleId]
    );

    // Get all sessions
    const sessionsRes = await query(
      `SELECT * FROM sync_exchange_sessions
       WHERE cycle_id = $1
       ORDER BY session_index ASC`,
      [cycleId]
    );

    res.json({
      cycle,
      participants: participantsRes.rows,
      sessions: sessionsRes.rows
    });
  } catch (err) {
    console.error('GET /sync-exchanges/:id/workspace error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/:cycleId/sessions - Create a session
router.post('/:cycleId/sessions', authenticateToken, async (req, res) => {
  const { cycleId } = req.params;
  const userId = req.user.id;
  const { scheduledAt, durationMinutes, meetingLink, topicsCovered, sessionNotes, skillPairIndex } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify user is participant and cycle is active
    const cycleCheck = await client.query(
      `SELECT ec.id, ec.session_count, ec.current_session_index, ec.status
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.id = $2 AND ec.status = 'active'`,
      [userId, cycleId]
    );
    if (cycleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Active cycle not found or access denied' });
    }
    const cycle = cycleCheck.rows[0];

    // Find next session index (per pair if skill_pair_index set, else global)
    const lastSession = skillPairIndex !== undefined && skillPairIndex !== null
      ? await client.query(
          `SELECT COALESCE(MAX(session_index), 0) AS last_idx FROM sync_exchange_sessions WHERE cycle_id = $1 AND skill_pair_index = $2`,
          [cycleId, skillPairIndex]
        )
      : await client.query(
          `SELECT COALESCE(MAX(session_index), 0) AS last_idx FROM sync_exchange_sessions WHERE cycle_id = $1`,
          [cycleId]
        );
    const nextIndex = lastSession.rows[0].last_idx + 1;

    // Guard against exceeding pair-specific session count if set
    if (skillPairIndex !== undefined && skillPairIndex !== null) {
      const pairCountRes = await client.query(
        `SELECT pair_session_counts FROM exchange_cycles WHERE id = $1`,
        [cycleId]
      );
      const pairCounts = pairCountRes.rows[0]?.pair_session_counts || {};
      const pairMax = pairCounts[String(skillPairIndex)];
      const pairDone = await client.query(
        `SELECT COUNT(*) AS cnt FROM sync_exchange_sessions WHERE cycle_id = $1 AND skill_pair_index = $2`,
        [cycleId, skillPairIndex]
      );
      if (pairMax && parseInt(pairDone.rows[0].cnt) >= pairMax) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'All sessions for this skill pair already scheduled' });
      }
    }

    const verificationCode = generateVerificationCode();

    // Auto-generate Jitsi room if no meeting link provided
    const resolvedMeetingLink = meetingLink || generateJitsiRoom();

    const sessionRes = await client.query(
      `INSERT INTO sync_exchange_sessions
         (cycle_id, session_index, scheduled_at, duration_minutes, meeting_link,
          topics_covered, session_notes, verification_code, skill_pair_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [cycleId, nextIndex, scheduledAt || null, durationMinutes || 60,
       resolvedMeetingLink, topicsCovered || null, sessionNotes || null, verificationCode,
       skillPairIndex !== undefined ? skillPairIndex : null]
    );

    await client.query('COMMIT');
    res.status(201).json(sessionRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /sync-exchanges/:id/sessions error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync-exchanges/sessions/:sessionId/verify-code - Verify code and auto-confirm
router.post('/sessions/:sessionId/verify-code', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const { verificationCode } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query(
      `SELECT ses.*, ec.total_participants
       FROM sync_exchange_sessions ses
       JOIN exchange_cycles ec ON ec.id = ses.cycle_id
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2 FOR UPDATE`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    if (session.verification_code !== verificationCode.toUpperCase().trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark confirmed for this user
    const confirmations = session.confirmations || {};
    confirmations[userId] = { confirmed: true, confirmed_at: new Date().toISOString() };

    await client.query(
      `UPDATE sync_exchange_sessions SET confirmations = $1 WHERE id = $2`,
      [JSON.stringify(confirmations), sessionId]
    );

    // For pair sessions only 2 confirmations needed; for cycle-wide sessions use total_participants
    const requiredConfirmations = session.skill_pair_index !== null && session.skill_pair_index !== undefined ? 2 : session.total_participants;
    const allConfirmed = Object.keys(confirmations).length >= requiredConfirmations;

    if (allConfirmed) {
      await client.query(
        `UPDATE sync_exchange_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      // Update cycle progress
      const completedRes = await client.query(
        `SELECT COUNT(*) AS cnt FROM sync_exchange_sessions WHERE cycle_id = $1 AND status = 'completed'`,
        [session.cycle_id]
      );
      const completedCount = parseInt(completedRes.rows[0].cnt);

      await client.query(
        `UPDATE exchange_cycles SET current_session_index = $1 WHERE id = $2`,
        [completedCount, session.cycle_id]
      );

      // Cycle completes only when every pair has finished all its own assigned sessions
      const cycleRes = await client.query(
        `SELECT pair_session_counts, cycle_length FROM exchange_cycles WHERE id = $1`,
        [session.cycle_id]
      );
      const pairCounts = cycleRes.rows[0]?.pair_session_counts || {};
      const cycleLength = cycleRes.rows[0]?.cycle_length || 0;
      const allPairsSet = Object.keys(pairCounts).length >= cycleLength;

      let cycleComplete = false;
      if (allPairsSet && cycleLength > 0) {
        // Every pair must have required > 0
        const allPairsHaveCount = Object.values(pairCounts).every(r => Number(r) > 0);
        if (allPairsHaveCount) {
          // Check each pair individually: completed sessions for that pair >= its required count
          const perPairRes = await client.query(
            `SELECT skill_pair_index, COUNT(*) AS cnt
             FROM sync_exchange_sessions
             WHERE cycle_id = $1 AND status = 'completed'
             GROUP BY skill_pair_index`,
            [session.cycle_id]
          );
          const completedPerPair = {};
          for (const row of perPairRes.rows) {
            completedPerPair[String(row.skill_pair_index)] = parseInt(row.cnt);
          }
          cycleComplete = Object.entries(pairCounts).every(([pairIdx, required]) =>
            Number(required) > 0 && (completedPerPair[String(pairIdx)] || 0) >= Number(required)
          );
        }
      }

      if (cycleComplete) {
        await client.query(
          `UPDATE exchange_cycles SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [session.cycle_id]
        );
        // Clear active_sync_exchange_id for all participants
        await client.query(
          `UPDATE users SET active_sync_exchange_id = NULL WHERE active_sync_exchange_id = $1`,
          [session.cycle_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Code verified',
      allConfirmed,
      confirmedCount: Object.keys(confirmations).length,
      totalParticipants: requiredConfirmations
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /sync-exchanges/sessions/:id/verify-code error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync-exchanges/sessions/:sessionId/end-meeting - Instructor ends meeting, triggers attendance confirmation phase
router.post('/sessions/:sessionId/end-meeting', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  try {
    // Verify user is the instructor (teacher) of this pair
    const sessionRes = await query(
      `SELECT ses.*, ec.id AS cycle_id
       FROM sync_exchange_sessions ses
       JOIN exchange_cycles ec ON ec.id = ses.cycle_id
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    await query(
      `UPDATE sync_exchange_sessions
       SET meeting_ended = TRUE,
           status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           actual_ended_at = CURRENT_TIMESTAMP,
           join_timestamps = CASE
             WHEN join_timestamps ? $2 THEN join_timestamps
             ELSE COALESCE(join_timestamps, '{}'::jsonb) || jsonb_build_object($2, $3::TEXT)
           END,
           actual_started_at = COALESCE(actual_started_at, CURRENT_TIMESTAMP),
           actual_duration_minutes = CASE
             WHEN actual_started_at IS NOT NULL
             THEN GREATEST(1, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - actual_started_at))::INTEGER / 60)
             ELSE NULL
           END
       WHERE id = $1`,
      [sessionId, userId, new Date().toISOString()]
    );

    // Check if the whole cycle is now complete
    const cycleRes = await query(
      `SELECT pair_session_counts, cycle_length FROM exchange_cycles WHERE id = $1`,
      [session.cycle_id]
    );
    const pairCounts = cycleRes.rows[0]?.pair_session_counts || {};
    const cycleLength = cycleRes.rows[0]?.cycle_length || 0;
    const allPairsSet = Object.keys(pairCounts).length >= cycleLength;
    const allPairsHaveCount = Object.values(pairCounts).every(r => Number(r) > 0);

    if (allPairsSet && allPairsHaveCount && cycleLength > 0) {
      const perPairRes = await query(
        `SELECT skill_pair_index, COUNT(*) AS cnt FROM sync_exchange_sessions
         WHERE cycle_id = $1 AND status = 'completed' GROUP BY skill_pair_index`,
        [session.cycle_id]
      );
      const completedPerPair = {};
      for (const row of perPairRes.rows) {
        completedPerPair[String(row.skill_pair_index)] = parseInt(row.cnt);
      }
      const cycleComplete = Object.entries(pairCounts).every(([pairIdx, required]) =>
        Number(required) > 0 && (completedPerPair[String(pairIdx)] || 0) >= Number(required)
      );
      if (cycleComplete) {
        await query(
          `UPDATE exchange_cycles SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [session.cycle_id]
        );
        await query(
          `UPDATE users SET active_sync_exchange_id = NULL WHERE active_sync_exchange_id = $1`,
          [session.cycle_id]
        );
      }
    }

    res.json({ message: 'Meeting ended and session completed.' });
  } catch (err) {
    console.error('POST /sync-exchanges/sessions/:id/end-meeting error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/sessions/:sessionId/join - Record when a participant joins the meeting
router.post('/sessions/:sessionId/join', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  try {
    // Verify participant belongs to cycle
    const sessionRes = await query(
      `SELECT ses.*
       FROM sync_exchange_sessions ses
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    // Append join timestamp for this user
    const joinTimestamps = session.join_timestamps || {};
    if (joinTimestamps[userId]) {
      return res.json({ message: 'Join already recorded' });
    }
    joinTimestamps[userId] = new Date().toISOString();
    const joinCount = Object.keys(joinTimestamps).length;

    await query(
      `UPDATE sync_exchange_sessions
       SET join_timestamps = $1,
           actual_started_at = CASE
             WHEN actual_started_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE actual_started_at
           END
       WHERE id = $2`,
      [JSON.stringify(joinTimestamps), sessionId]
    );

    res.json({ message: 'Join recorded' });
  } catch (err) {
    console.error('POST /sync-exchanges/sessions/:id/join error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sync-exchanges/sessions/:sessionId - Instructor deletes a scheduled session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  try {
    const sessionRes = await query(
      `SELECT ses.*, ec.id AS cycle_id
       FROM sync_exchange_sessions ses
       JOIN exchange_cycles ec ON ec.id = ses.cycle_id
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2 AND ses.status = 'scheduled'`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Scheduled session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    // Only the teacher of this pair can delete
    const teacherCheck = await query(
      `SELECT 1 FROM cycle_participants
       WHERE cycle_id = $1 AND user_id = $2 AND position_in_cycle = $3`,
      [session.cycle_id, userId, session.skill_pair_index]
    );
    if (teacherCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only the instructor can delete this session' });
    }

    await query(`DELETE FROM sync_exchange_sessions WHERE id = $1`, [sessionId]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('DELETE /sync-exchanges/sessions/:id error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/sessions/:sessionId/confirm - Confirm attendance (no code)
router.post('/sessions/:sessionId/confirm', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const { notes } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query(
      `SELECT ses.*, ec.total_participants, ec.session_count
       FROM sync_exchange_sessions ses
       JOIN exchange_cycles ec ON ec.id = ses.cycle_id
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2 FOR UPDATE`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    const confirmations = session.confirmations || {};
    confirmations[userId] = {
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      notes: notes || null
    };

    await client.query(
      `UPDATE sync_exchange_sessions SET confirmations = $1 WHERE id = $2`,
      [JSON.stringify(confirmations), sessionId]
    );

    const requiredConfirmations = session.skill_pair_index !== null && session.skill_pair_index !== undefined ? 2 : session.total_participants;
    const allConfirmed = Object.keys(confirmations).length >= requiredConfirmations;

    if (allConfirmed) {
      await client.query(
        `UPDATE sync_exchange_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      const completedRes = await client.query(
        `SELECT COUNT(*) AS cnt FROM sync_exchange_sessions WHERE cycle_id = $1 AND status = 'completed'`,
        [session.cycle_id]
      );
      const completedCount = parseInt(completedRes.rows[0].cnt);

      await client.query(
        `UPDATE exchange_cycles SET current_session_index = $1 WHERE id = $2`,
        [completedCount, session.cycle_id]
      );

      // Cycle completes only when every pair has finished all its own assigned sessions
      const cycleRes = await client.query(
        `SELECT pair_session_counts, cycle_length FROM exchange_cycles WHERE id = $1`,
        [session.cycle_id]
      );
      const pairCounts = cycleRes.rows[0]?.pair_session_counts || {};
      const cycleLength = cycleRes.rows[0]?.cycle_length || 0;
      const allPairsSet = Object.keys(pairCounts).length >= cycleLength;

      let cycleComplete = false;
      if (allPairsSet && cycleLength > 0) {
        // Every pair must have required > 0
        const allPairsHaveCount = Object.values(pairCounts).every(r => Number(r) > 0);
        if (allPairsHaveCount) {
          const perPairRes = await client.query(
            `SELECT skill_pair_index, COUNT(*) AS cnt
             FROM sync_exchange_sessions
             WHERE cycle_id = $1 AND status = 'completed'
             GROUP BY skill_pair_index`,
            [session.cycle_id]
          );
          const completedPerPair = {};
          for (const row of perPairRes.rows) {
            completedPerPair[String(row.skill_pair_index)] = parseInt(row.cnt);
          }
          cycleComplete = Object.entries(pairCounts).every(([pairIdx, required]) =>
            Number(required) > 0 && (completedPerPair[String(pairIdx)] || 0) >= Number(required)
          );
        }
      }

      if (cycleComplete) {
        await client.query(
          `UPDATE exchange_cycles SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [session.cycle_id]
        );
        await client.query(
          `UPDATE users SET active_sync_exchange_id = NULL WHERE active_sync_exchange_id = $1`,
          [session.cycle_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Attendance confirmed',
      allConfirmed,
      confirmedCount: Object.keys(confirmations).length,
      totalParticipants: session.total_participants
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /sync-exchanges/sessions/:id/confirm error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync-exchanges/sessions/:sessionId/rate - Rate a session
router.post('/sessions/:sessionId/rate', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query(
      `SELECT ses.*
       FROM sync_exchange_sessions ses
       JOIN cycle_participants cp ON cp.cycle_id = ses.cycle_id AND cp.user_id = $1
       WHERE ses.id = $2 AND ses.status = 'completed' FOR UPDATE`,
      [userId, sessionId]
    );
    if (sessionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Completed session not found or access denied' });
    }
    const session = sessionRes.rows[0];

    const ratings = session.ratings || {};
    ratings[userId] = { rating, review: review || null, rated_at: new Date().toISOString() };

    await client.query(
      `UPDATE sync_exchange_sessions SET ratings = $1 WHERE id = $2`,
      [JSON.stringify(ratings), sessionId]
    );

    // Update teacher's overall rating (the participant who taught THIS user)
    // Find who taught this user in the cycle
    const myParticipant = await query(
      `SELECT cp.position_in_cycle FROM cycle_participants cp WHERE cp.cycle_id = $1 AND cp.user_id = $2`,
      [session.cycle_id, userId]
    );
    if (myParticipant.rows.length > 0) {
      // The teacher is the previous participant in the cycle
      const myPos = myParticipant.rows[0].position_in_cycle;
      const teacherPos = await query(
        `SELECT user_id FROM cycle_participants WHERE cycle_id = $1 AND position_in_cycle = $2`,
        [session.cycle_id, myPos === 0 ?
          (await query(`SELECT COUNT(*)-1 AS cnt FROM cycle_participants WHERE cycle_id = $1`, [session.cycle_id])).rows[0].cnt
          : myPos - 1]
      );
      if (teacherPos.rows.length > 0) {
        await client.query(
          `UPDATE users SET
             total_rating = (total_rating * rating_count + $1) / (rating_count + 1),
             rating_count = rating_count + 1
           WHERE id = $2`,
          [rating, teacherPos.rows[0].user_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Rating submitted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /sync-exchanges/sessions/:id/rate error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/sync-exchanges/history - Completed sync exchanges for current user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT ec.id, ec.cycle_data, ec.cycle_length, ec.cycle_score, ec.status,
              ec.session_count, ec.current_session_index, ec.created_at, ec.completed_at,
              cp.skill_offering AS teach_skill, cp.skill_receiving AS learn_skill
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.status = 'completed' AND ec.exchange_mode = 'sync'
       ORDER BY ec.completed_at DESC`,
      [req.user.id]
    );
    res.json({ exchanges: result.rows });
  } catch (err) {
    console.error('GET /sync-exchanges/history error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sync-exchanges/:cycleId/review - Submit a review for a completed sync exchange
router.post('/:cycleId/review', authenticateToken, async (req, res) => {
  try {
    const { cycleId } = req.params;
    const { rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify cycle is completed and reviewer is a participant
      const cycleCheck = await client.query(
        `SELECT ec.*, cp.position_in_cycle, cp.skill_offering as my_teach_skill, cp.skill_receiving as my_learn_skill
         FROM exchange_cycles ec
         JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
         WHERE ec.id = $2 AND ec.status = 'completed'`,
        [reviewerId, cycleId]
      );

      if (cycleCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Completed cycle not found or access denied' });
      }

      const cycle = cycleCheck.rows[0];
      const myPosition = cycle.position_in_cycle;

      // Find the teacher (previous participant in cycle)
      // In a cycle, each person teaches the next person
      const teacherPosition = myPosition === 0 
        ? cycle.cycle_length - 1 
        : myPosition - 1;

      const teacherResult = await client.query(
        `SELECT cp.user_id, cp.skill_offering
         FROM cycle_participants cp
         WHERE cp.cycle_id = $1 AND cp.position_in_cycle = $2`,
        [cycleId, teacherPosition]
      );

      if (teacherResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Teacher not found in cycle' });
      }

      const teacher = teacherResult.rows[0];
      const revieweeId = teacher.user_id;
      const skillTitle = teacher.skill_offering;

      // Check if review already exists
      const existingReview = await client.query(
        `SELECT id FROM cycle_reviews 
         WHERE cycle_id = $1 AND reviewer_id = $2 AND reviewee_id = $3`,
        [cycleId, reviewerId, revieweeId]
      );

      if (existingReview.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'You have already reviewed this teacher in this cycle' });
      }

      // Insert the review
      const reviewResult = await client.query(
        `INSERT INTO cycle_reviews (cycle_id, reviewer_id, reviewee_id, skill_title, rating, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [cycleId, reviewerId, revieweeId, skillTitle, rating, comment || null]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Review submitted successfully',
        review: reviewResult.rows[0]
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /sync-exchanges/:cycleId/review error:', err);
    res.status(500).json({ message: err.message || 'Failed to submit review' });
  }
});

// GET /api/sync-exchanges/:cycleId/review - Check if current user has reviewed this cycle
router.get('/:cycleId/review', authenticateToken, async (req, res) => {
  try {
    const { cycleId } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT cr.*, u.first_name || ' ' || u.last_name as reviewee_name
       FROM cycle_reviews cr
       JOIN users u ON cr.reviewee_id = u.id
       WHERE cr.cycle_id = $1 AND cr.reviewer_id = $2`,
      [cycleId, userId]
    );

    res.json({ review: result.rows[0] || null });
  } catch (err) {
    console.error('GET /sync-exchanges/:cycleId/review error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
