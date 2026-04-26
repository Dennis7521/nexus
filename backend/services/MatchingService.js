const { query } = require('../config/database');
const GraphService = require('./GraphService');

const MatchingService = {
  findAsyncMatches: async (learnerId, skillName, options = {}) => {
    const limit = Number(options.limit || 10);

    const candidates = await GraphService.findTeachersForSkill(skillName, learnerId, limit * 3);
    
    const scored = candidates.map((c) => ({
      candidate: c,
      score: GraphService.scoreCandidate(c),
    }));

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    const results = top.map(({ candidate, score }) => ({
      teacherId: candidate.user_id,
      teacherName: `${candidate.first_name} ${candidate.last_name}`.trim(),
      teacherEmail: candidate.email,
      rating: Number(candidate.total_rating || 0),
      ratingCount: Number(candidate.rating_count || 0),
      skillId: candidate.skill_id,
      skillTitle: candidate.skill_title,
      creditsRequired: Number(candidate.credits_required || 0),
      timeCommitmentHours: Number(candidate.time_commitment_hours || 0),
      timeCommitmentPeriod: candidate.time_commitment_period || null,
      score,
    }));

    try {
      let persistedCount = 0;
      for (const r of results) {
        try {
          // Check if match already exists
          const existing = await query(
            `SELECT id FROM skill_matches 
             WHERE learner_id = $1 AND teacher_id = $2 AND skill_name = $3 
             AND status NOT IN ('rejected', 'expired')`,
            [learnerId, r.teacherId, r.skillTitle || skillName]
          );
          
          let result;
          if (existing.rows.length > 0) {
            // Update existing match
            result = await query(
              `UPDATE skill_matches 
               SET match_score = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2
               RETURNING id`,
              [r.score, existing.rows[0].id]
            );
          } else {
            // Insert new match
            result = await query(
              `INSERT INTO skill_matches (learner_id, teacher_id, skill_name, match_score, status)
               VALUES ($1, $2, $3, $4, 'suggested')
               RETURNING id`,
              [learnerId, r.teacherId, r.skillTitle || skillName, r.score]
            );
          }
          if (result.rows.length > 0) {
            persistedCount++;
          }
        } catch (err) {
          console.error(`  ERROR: Failed to persist match for ${r.teacherName}:`, err.message);
        }
      }
    } catch (e) {
      console.error('WARNING: Failed to persist matches:', e.message, e.stack);
    }

    return results;
  },

  // Find and score exchange cycles for synchronous matching
  findCycles: async (options = {}) => {
    const maxLength = Number(options.maxLength || 5);
    const minScore = Number(options.minScore || 50);

    const cycles = await GraphService.findAllCycles(maxLength);

    // Score and filter cycles
    const scoredCycles = [];
    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      
      const isValid = await GraphService.validateCycle(cycle);
      if (!isValid) continue;

      const score = MatchingService.scoreCycle(cycle);
      
      if (score >= minScore) {
        scoredCycles.push({ cycle, score });
      }
    }

    // Filter out cycles that have already been completed with the same participants
    const uniqueCycles = [];
    for (const { cycle, score } of scoredCycles) {
      const isDuplicate = await MatchingService.hasCompletedCycle(cycle);
      if (isDuplicate) {
        continue;
      }
      uniqueCycles.push({ cycle, score });
    }

    // Sort by score descending
    uniqueCycles.sort((a, b) => b.score - a.score);

    return uniqueCycles;
  },

  // Check if the same group of participants have already completed a cycle together
  hasCompletedCycle: async (cycle) => {
    const { query } = require('../config/database');
    
    // Extract user IDs from the cycle and sort them for consistent comparison
    const userIds = cycle.map(node => node.userId).sort();
    const cycleUserKey = userIds.join(',');
    
    // Find all completed cycles
    const completedCycles = await query(
      `SELECT ec.id, ec.cycle_data
       FROM exchange_cycles ec
       WHERE ec.status = 'completed'
         AND ec.exchange_mode = 'sync'
         AND ec.total_participants = $1`,
      [cycle.length]
    );
    
    // Check if any completed cycle has the exact same participant set
    for (const row of completedCycles.rows) {
      const completedParticipants = row.cycle_data?.participants || [];
      const completedUserIds = completedParticipants.map(p => p.userId).sort();
      const completedUserKey = completedUserIds.join(',');
      
      if (completedUserKey === cycleUserKey) {
        return true; // Same group has completed a cycle together
      }
    }
    
    return false;
  },

  // Score a cycle based on participant ratings and cycle properties
  scoreCycle: (cycle) => {
    if (!cycle || cycle.length < 2) return 0;

    // Average participant quality (based on ratings)
    let totalRating = 0;
    let ratingCount = 0;
    cycle.forEach(node => {
      if (node.rating !== undefined) {
        totalRating += Number(node.rating || 0);
        ratingCount++;
      }
    });
    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const ratingScore = (avgRating / 5) * 40; // up to 40 points

    // Cycle length bonus (shorter cycles are easier to coordinate)
    const lengthBonus = Math.max(0, 30 - (cycle.length - 2) * 5); // 30 for length 2, 25 for 3, etc.

    // Skill diversity bonus (different skills = more valuable)
    const uniqueSkills = new Set(cycle.map(n => n.skill).filter(Boolean));
    const diversityBonus = Math.min(uniqueSkills.size * 5, 20);

    // Availability/compatibility placeholder
    const compatibilityScore = 10;

    const total = ratingScore + lengthBonus + diversityBonus + compatibilityScore;
    return Math.max(0, Math.min(100, Math.round(total)));
  },

  // Persist detected cycles to database
  persistCycles: async (scoredCycles) => {
    const { query, getClient } = require('../config/database');
    const persistedCount = [];

    for (const { cycle, score } of scoredCycles) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Insert cycle tagged as sync (credit-free) mode
        const cycleData = { participants: cycle };
        const cycleResult = await client.query(
          `INSERT INTO exchange_cycles
             (cycle_data, cycle_length, cycle_score, total_participants, status, exchange_mode, session_count)
           VALUES ($1, $2, $3, $4, 'proposed', 'sync', 0)
           RETURNING id`,
          [JSON.stringify(cycleData), cycle.length, score, cycle.length]
        );
        const cycleId = cycleResult.rows[0].id;

        // Insert participants
        for (let i = 0; i < cycle.length; i++) {
          const node = cycle[i];
          await client.query(
            `INSERT INTO cycle_participants 
             (cycle_id, user_id, position_in_cycle, skill_offering, skill_receiving, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [cycleId, node.userId, i, node.skill, node.wantSkill]
          );
        }

        await client.query('COMMIT');
        persistedCount.push(cycleId);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('WARNING: Failed to persist cycle:', e.message);
      } finally {
        client.release();
      }
    }

    return persistedCount;
  },
};

module.exports = MatchingService;
