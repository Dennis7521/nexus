const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MatchingService = require('../services/MatchingService');

router.get('/async/:skill', authenticateToken, async (req, res) => {
  const skill = req.params.skill;
  const limit = Number(req.query.limit || 10);
  if (!skill) return res.status(400).json({ message: 'Skill required' });
  try {
    console.log(`Finding matches for skill: "${skill}", user: ${req.user.id}, limit: ${limit}`);
    const matches = await MatchingService.findAsyncMatches(req.user.id, skill, { limit });
    console.log(`Found ${matches.length} matches`);
    res.json({ matches });
  } catch (error) {
    console.error('ERROR: Match endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch matches', error: error.message });
  }
});

// Get all match suggestions for current user
router.get('/suggestions', authenticateToken, async (req, res) => {
  const { query } = require('../config/database');
  const userId = req.user.id;
  const status = req.query.status || 'suggested'; // suggested, contacted, accepted, completed, cancelled
  const minScore = Number(req.query.minScore || 0);
  const limit = Number(req.query.limit || 20);
  const offset = Number(req.query.offset || 0);

  try {
    // Resolve the underlying published skill card (most recent active match) so the frontend
    // can fire a real /exchanges/request via skillId. Matches without a backing skill card
    // are filtered out — they cannot be booked.
    //
    // For status='suggested' we also surface 'contacted' matches that have no active
    // exchange_request behind them. This recovers two classes of zombie rows:
    //   (a) legacy matches contacted via the old chat-only button (no request was ever created)
    //   (b) matches whose request was rejected / cancelled / expired
    // Matches with a live pending or accepted request stay hidden, since the user is already
    // tracking those under /requests.
    const showZombies = status === 'suggested';
    const sql = `
      SELECT 
        sm.id,
        sm.teacher_id,
        sm.skill_name,
        sm.match_score,
        sm.status,
        sm.created_at,
        u.first_name,
        u.last_name,
        u.email,
        u.total_rating,
        u.rating_count,
        u.profile_picture_url,
        s.skill_id,
        s.credits_required
      FROM skill_matches sm
      JOIN users u ON u.id = sm.teacher_id
      LEFT JOIN LATERAL (
        SELECT id AS skill_id, credits_required
        FROM skills
        WHERE user_id = sm.teacher_id
          AND is_active = TRUE
          AND TRIM(LOWER(title)) LIKE '%' || TRIM(LOWER(sm.skill_name)) || '%'
        ORDER BY created_at DESC
        LIMIT 1
      ) s ON TRUE
      WHERE sm.learner_id = $1
        AND sm.match_score >= $3
        AND (
          sm.status = $2
          OR (
            $6::boolean = TRUE
            AND sm.status = 'contacted'
            AND s.skill_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM exchange_requests er
              WHERE er.requester_id = sm.learner_id
                AND er.instructor_id = sm.teacher_id
                AND er.skill_id = s.skill_id
                AND er.status IN ('pending', 'accepted')
            )
          )
        )
      ORDER BY sm.match_score DESC, sm.created_at DESC
      LIMIT $4 OFFSET $5
    `;
    const result = await query(sql, [userId, status, minScore, limit, offset, showZombies]);
    
    const suggestions = result.rows.map(row => ({
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: `${row.first_name} ${row.last_name}`.trim(),
      teacherEmail: row.email,
      teacherPicture: row.profile_picture_url,
      rating: Number(row.total_rating || 0),
      ratingCount: Number(row.rating_count || 0),
      skillName: row.skill_name,
      skillId: row.skill_id || null,
      creditsRequired: row.credits_required != null ? Number(row.credits_required) : null,
      matchScore: Number(row.match_score),
      status: row.status,
      createdAt: row.created_at
    }));

    res.json({ suggestions, total: suggestions.length });
  } catch (error) {
    console.error('ERROR: Suggestions endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch suggestions', error: error.message });
  }
});

// Update match status (e.g., mark as contacted)
router.post('/:matchId/contact', authenticateToken, async (req, res) => {
  const { query } = require('../config/database');
  const matchId = req.params.matchId;
  const userId = req.user.id;

  try {
    const sql = `
      UPDATE skill_matches
      SET status = 'contacted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND learner_id = $2
      RETURNING *
    `;
    const result = await query(sql, [matchId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found or unauthorized' });
    }

    res.json({ message: 'Match status updated', match: result.rows[0] });
  } catch (error) {
    console.error('ERROR: Contact endpoint error:', error);
    res.status(500).json({ message: 'Failed to update match status', error: error.message });
  }
});

// Find exchange cycles (synchronous matching)
router.get('/cycles', authenticateToken, async (req, res) => {
  const maxLength = Number(req.query.maxLength || 5);
  const minLength = Number(req.query.minLength || 3); // Default: 3+ person cycles only
  const minScore = Number(req.query.minScore || 50);

  try {
    const scoredCycles = await MatchingService.findCycles({ maxLength, minScore });
    
    // Filter by minimum cycle length (exclude 2-person 1-on-1 exchanges)
    const filteredCycles = scoredCycles.filter(({ cycle }) => cycle.length >= minLength);
    
    // Optionally persist top cycles
    if (req.query.persist === 'true' && filteredCycles.length > 0) {
      const limit = Number(req.query.persistLimit || 10);
      const toPersist = filteredCycles.slice(0, limit);
      await MatchingService.persistCycles(toPersist);
    }

    res.json({ cycles: filteredCycles, total: filteredCycles.length });
  } catch (error) {
    console.error('ERROR: Cycles endpoint error:', error);
    res.status(500).json({ message: 'Failed to find cycles', error: error.message });
  }
});

// Get cycles for current user
router.get('/cycles/my', authenticateToken, async (req, res) => {
  const { query } = require('../config/database');
  const userId = req.user.id;
  const status = req.query.status || 'proposed';

  try {
    const sql = `
      SELECT 
        ec.id,
        ec.cycle_data,
        ec.cycle_length,
        ec.cycle_score,
        ec.status,
        ec.created_at,
        cp.position_in_cycle,
        cp.skill_offering as teach_skill,
        cp.skill_receiving as learn_skill,
        cp.status as acceptance_status
      FROM exchange_cycles ec
      JOIN cycle_participants cp ON cp.cycle_id = ec.id
      WHERE cp.user_id = $1
        AND ec.status = $2
        AND ec.cycle_length >= 3
      ORDER BY ec.cycle_score DESC, ec.created_at DESC
    `;
    const result = await query(sql, [userId, status]);

    // Filter out proposed cycles that are duplicates of completed cycles
    const filteredRows = [];
    for (const cycle of result.rows) {
      // Only filter proposed cycles (not completed ones)
      if (status === 'proposed') {
        const participants = cycle.cycle_data?.participants || [];
        if (participants.length > 0) {
          const isDuplicate = await MatchingService.hasCompletedCycle(participants);
          if (isDuplicate) {
            console.log(`Filtering proposed cycle ${cycle.id}: same participants already completed a cycle`);
            continue;
          }
        }
      }
      filteredRows.push(cycle);
    }

    // Enrich cycle data with participant names
    const enrichedCycles = await Promise.all(filteredRows.map(async (cycle) => {
      const participants = cycle.cycle_data.participants || [];
      
      // Fetch names for all participants
      const userIds = participants.map(p => p.userId);
      if (userIds.length > 0) {
        const usersResult = await query(
          `SELECT id, first_name, last_name FROM users WHERE id = ANY($1)`,
          [userIds]
        );
        
        // Create a map of userId to name
        const userMap = {};
        usersResult.rows.forEach(u => {
          userMap[u.id] = `${u.first_name} ${u.last_name}`;
        });
        
        // Add names to participants
        cycle.cycle_data.participants = participants.map(p => ({
          ...p,
          name: userMap[p.userId] || 'Unknown User'
        }));
      }
      
      return cycle;
    }));

    res.json({ cycles: enrichedCycles, total: enrichedCycles.length });
  } catch (error) {
    console.error('ERROR: My cycles endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch cycles', error: error.message });
  }
});

// Accept/reject cycle participation
router.post('/cycles/:cycleId/respond', authenticateToken, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const cycleId = req.params.cycleId;
  const userId = req.user.id;
  const { accept } = req.body; // true or false

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update participant status
    const newStatus = accept ? 'accepted' : 'rejected';
    await client.query(
      `UPDATE cycle_participants
       SET status = $1, responded_at = NOW()
       WHERE cycle_id = $2 AND user_id = $3`,
      [newStatus, cycleId, userId]
    );

    // Check if all participants accepted
    const participantsResult = await client.query(
      `SELECT status FROM cycle_participants WHERE cycle_id = $1`,
      [cycleId]
    );
    const allAccepted = participantsResult.rows.every(p => p.status === 'accepted');
    const anyRejected = participantsResult.rows.some(p => p.status === 'rejected');

    // Update cycle status
    let cycleStatus = 'pending';
    if (allAccepted) cycleStatus = 'accepted';
    else if (anyRejected) cycleStatus = 'rejected';

    await client.query(
      `UPDATE exchange_cycles SET status = $1 WHERE id = $2`,
      [cycleStatus, cycleId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Response recorded', cycleStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ERROR: Cycle response error:', error);
    res.status(500).json({ message: 'Failed to respond to cycle', error: error.message });
  } finally {
    client.release();
  }
});

// Debug: Test graph building
router.get('/debug/graph', authenticateToken, async (req, res) => {
  const GraphService = require('../services/GraphService');
  try {
    const graph = await GraphService.buildSkillGraph(true); // force refresh
    const nodeCount = Object.keys(graph).length;
    const edgeCount = Object.values(graph).reduce((sum, edges) => sum + edges.length, 0);
    res.json({ nodeCount, edgeCount, graph });
  } catch (error) {
    console.error('Graph debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Debug: Run cycle detection and show all found cycles (including 2-person)
router.get('/debug/cycles', authenticateToken, async (req, res) => {
  const GraphService = require('../services/GraphService');
  const { query } = require('../config/database');
  try {
    GraphService.clearCache();
    const graph = await GraphService.buildSkillGraph(true);
    const nodeCount = Object.keys(graph).length;

    // Get user names for readable output
    const userIds = Object.keys(graph);
    let userMap = {};
    if (userIds.length > 0) {
      const usersRes = await query(
        `SELECT id, first_name, last_name, skills_possessing, skills_interested_in FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      usersRes.rows.forEach(u => {
        userMap[u.id] = {
          name: `${u.first_name} ${u.last_name}`,
          possessing: u.skills_possessing,
          interested_in: u.skills_interested_in
        };
      });
    }

    const allCycles = await GraphService.findAllCycles(5, 200);
    const cyclesSummary = allCycles.map(cycle => ({
      length: cycle.length,
      participants: cycle.map(n => ({
        userId: n.userId,
        name: userMap[n.userId]?.name || 'Unknown',
        teaches: n.skill,
        learns: n.wantSkill
      }))
    }));

    res.json({
      graphNodeCount: nodeCount,
      totalCyclesFound: allCycles.length,
      multiPartyCycles: allCycles.filter(c => c.length >= 3).length,
      users: userMap,
      cycles: cyclesSummary
    });
  } catch (error) {
    console.error('Cycle debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Debug endpoint to see raw candidates
router.get('/debug/:skill', authenticateToken, async (req, res) => {
  const GraphService = require('../services/GraphService');
  const skill = req.params.skill;
  try {
    const candidates = await GraphService.findTeachersForSkill(skill, req.user.id, 25);
    res.json({ skill, userId: req.user.id, candidates });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
