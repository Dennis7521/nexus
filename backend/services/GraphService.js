const { query } = require('../config/database');

// Graph cache
let cachedGraph = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Minimal graph-like utilities for matching
const GraphService = {
  // Find instructors offering a given skill — only via published skill cards in the 'skills' table.
  // Matches against users.skills_possessing have been intentionally removed: those entries are not
  // real offerings (no credits, duration, or skill_id) and contacting them produces "ghost" matches
  // that cannot be booked. Instructors must publish a skill card to be matchable.
  findTeachersForSkill: async (skillName, excludeUserId, limit = 25) => {
    // Match a learner's interest against published skill cards using either:
    //   1. substring overlap in either direction (e.g. "Python" <-> "Python for Data Analysis"), OR
    //   2. shared meaningful word tokens of length >= 4 (e.g. "business skills" <-> "Business plan writing").
    // The token branch fixes the case where the interest phrase is broader than any single
    // skill-card title and pure LIKE fails. Length >= 4 filters out generic glue words
    // ("and", "for", "the", "with") while still matching domain words like "data", "java", "math".
    const fromSkillsSql = `
      SELECT 
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.total_rating,
        u.rating_count,
        s.id AS skill_id,
        s.title AS skill_title,
        s.credits_required,
        s.duration_per_week,
        s.created_at
        ,CASE
          WHEN TRIM(LOWER(s.title)) = TRIM(LOWER($1)) THEN 'exact'
          WHEN TRIM(LOWER(s.title)) LIKE '%' || TRIM(LOWER($1)) || '%'
            OR TRIM(LOWER($1)) LIKE '%' || TRIM(LOWER(s.title)) || '%' THEN 'substring'
          ELSE 'token'
        END AS match_quality
      FROM skills s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_active = TRUE
        AND u.id <> $2
        AND (
          TRIM(LOWER(s.title)) LIKE '%' || TRIM(LOWER($1)) || '%'
          OR TRIM(LOWER($1)) LIKE '%' || TRIM(LOWER(s.title)) || '%'
          OR EXISTS (
            SELECT 1
            FROM regexp_split_to_table(LOWER(s.title), '[^a-z0-9]+') AS title_tok(tok)
            WHERE LENGTH(title_tok.tok) >= 4
              AND title_tok.tok = ANY (
                ARRAY(
                  SELECT tok
                  FROM regexp_split_to_table(LOWER($1), '[^a-z0-9]+') AS interest_tok(tok)
                  WHERE LENGTH(tok) >= 4
                )
              )
          )
        )
      ORDER BY s.created_at DESC
      LIMIT $3
    `;
    const aRes = await query(fromSkillsSql, [skillName, excludeUserId, limit]);
    const rows = aRes.rows.map((r) => {
      const { hours, period } = parseDuration(r.duration_per_week);
      return {
        ...r,
        time_commitment_hours: hours,
        time_commitment_period: period,
      };
    });

    // Deduplicate by user_id (a teacher may have multiple matching skill cards — keep the most recent)
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.user_id)) {
        map.set(row.user_id, row);
      }
    });

    return Array.from(map.values());
  },

  // Build directed skill exchange graph
  // Returns adjacency list: { userId: [{ toUser, skill, wantSkill }] }
  //
  // Edges are sourced from published skill cards (skills table) as the offer side and the
  // learner's skills_interested_in array as the want side. We deliberately do NOT use
  // users.skills_possessing on the offer side: those entries have no credits, duration, or
  // skill_id and cannot anchor a real session, mirroring the async fix.
  //
  // Matching is fuzzy in either direction (substring + shared word tokens of length >= 4)
  // so e.g. an interest "Python" closes a cycle through a card titled "Python for Data
  // Analysis", and "business skills" closes through "Business plan writing".
  buildSkillGraph: async (forceRefresh = false) => {
    // Return cached graph if still valid
    if (!forceRefresh && cachedGraph && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedGraph;
    }
    
    const { query } = require('../config/database');
    // Exclude users who are already in an active sync exchange (one-at-a-time constraint)
    const sql = `
      SELECT DISTINCT
        u1.id AS from_user,
        u2.id AS to_user,
        s.title AS offer_skill,
        s.title AS want_skill
      FROM skills s
      JOIN users u1 ON u1.id = s.user_id
      CROSS JOIN users u2
      CROSS JOIN unnest(u2.skills_interested_in) s2(skill)
      WHERE u1.id <> u2.id
        AND s.is_active = TRUE
        AND u1.is_active = TRUE
        AND u2.is_active = TRUE
        AND u1.active_sync_exchange_id IS NULL
        AND u2.active_sync_exchange_id IS NULL
        AND (
          TRIM(LOWER(s.title)) LIKE '%' || TRIM(LOWER(s2.skill)) || '%'
          OR TRIM(LOWER(s2.skill)) LIKE '%' || TRIM(LOWER(s.title)) || '%'
          OR EXISTS (
            SELECT 1
            FROM regexp_split_to_table(LOWER(s.title), '[^a-z0-9]+') AS title_tok(tok)
            WHERE LENGTH(title_tok.tok) >= 4
              AND title_tok.tok = ANY (
                ARRAY(
                  SELECT tok
                  FROM regexp_split_to_table(LOWER(s2.skill), '[^a-z0-9]+') AS interest_tok(tok)
                  WHERE LENGTH(tok) >= 4
                )
              )
          )
        )
    `;
    const result = await query(sql, []);
    
    const graph = {};
    result.rows.forEach(row => {
      if (!graph[row.from_user]) graph[row.from_user] = [];
      graph[row.from_user].push({
        toUser: row.to_user,
        skill: row.offer_skill,
        wantSkill: row.want_skill
      });
    });
    
    // Cache the graph
    cachedGraph = graph;
    cacheTimestamp = Date.now();
    
    return graph;
  },

  // Find all cycles of length 2 to maxLength
  findAllCycles: async (maxLength = 3, maxResults = 100) => {
    const graph = await GraphService.buildSkillGraph();
    const allCycles = [];
    const visited = new Set();
    
    // Try starting from each node
    for (const startNode of Object.keys(graph)) {
      // Stop if we have enough results
      if (allCycles.length >= maxResults) break;
      
      const cycles = detectCyclesFromNode(graph, startNode, maxLength);
      cycles.forEach(cycle => {
        // Stop if we have enough results
        if (allCycles.length >= maxResults) return;
        
        // Normalize cycle to avoid duplicates (start from smallest userId)
        const normalized = normalizeCycle(cycle);
        const key = normalized.join('-');
        if (!visited.has(key)) {
          visited.add(key);
          allCycles.push(cycle);
        }
      });
    }
    
    return allCycles;
  },

  // Validate that a cycle is still valid (all users active, skills still match)
  validateCycle: async (cycle) => {
    const { query } = require('../config/database');
    
    // Check all users are active
    const userIds = cycle.map(node => node.userId);
    const userCheck = await query(
      `SELECT id FROM users WHERE id = ANY($1) AND is_active = TRUE`,
      [userIds]
    );
    if (userCheck.rows.length !== userIds.length) return false;
    
    // Check each edge still exists. Mirrors buildSkillGraph: the "from" user must still
    // have an active skill card whose title equals the cycle's recorded offer (a teacher
    // committed to that specific card), and the "to" user must still have an interest
    // that matches it under the same fuzzy rules (substring or shared token >= 4).
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];

      const edgeCheck = await query(
        `SELECT 1
         FROM skills s
         JOIN users u2 ON u2.id = $2
         WHERE s.user_id = $1
           AND s.is_active = TRUE
           AND TRIM(LOWER(s.title)) = TRIM(LOWER($3))
           AND EXISTS (
             SELECT 1 FROM unnest(u2.skills_interested_in) i(skill)
             WHERE TRIM(LOWER(i.skill)) LIKE '%' || TRIM(LOWER(s.title)) || '%'
                OR TRIM(LOWER(s.title)) LIKE '%' || TRIM(LOWER(i.skill)) || '%'
                OR EXISTS (
                  SELECT 1
                  FROM regexp_split_to_table(LOWER(s.title), '[^a-z0-9]+') AS t1(tok)
                  WHERE LENGTH(t1.tok) >= 4
                    AND t1.tok = ANY (
                      ARRAY(
                        SELECT tok
                        FROM regexp_split_to_table(LOWER(i.skill), '[^a-z0-9]+') AS t2(tok)
                        WHERE LENGTH(tok) >= 4
                      )
                    )
                )
           )
         LIMIT 1`,
        [from.userId, to.userId, from.skill]
      );
      if (edgeCheck.rows.length === 0) return false;
    }
    
    return true;
  },

  // Clear graph cache (call when users update skills)
  clearCache: () => {
    cachedGraph = null;
    cacheTimestamp = null;
  },

  // Scoring: Bayesian rating + match quality + recency + activity. Total budget = 100.
  // Availability and location were removed: NEXUS is a single-campus, fully virtual platform
  // (UB students, Jitsi sessions) so neither signal was meaningful, and keeping them as flat
  // placeholders just inflated every score uniformly.
  scoreCandidate: (candidate) => {
    const rating = Number(candidate.total_rating || 0);
    const ratingCount = Number(candidate.rating_count || 0);

    // Bayesian / Laplace-smoothed rating: blend the candidate's average rating with a
    // prior of 3.0/5 over 3 phantom reviews. Monotonic in count, never outranks a
    // genuinely well-reviewed teacher, and avoids the Wilson dip for n=1.
    const PRIOR_RATING = 3.0;
    const PRIOR_WEIGHT = 3;
    const adjusted = (rating * ratingCount + PRIOR_RATING * PRIOR_WEIGHT) / (ratingCount + PRIOR_WEIGHT);
    const ratingScore = (adjusted / 5) * 55; // up to 55 points

    // Match quality: how well the learner's interest aligned with the card title.
    // Falls back to substring if the column is missing (older callers).
    const matchQuality = candidate.match_quality || 'substring';
    const matchScore = matchQuality === 'exact' ? 35 : matchQuality === 'substring' ? 22 : 12;

    // Recency bonus: card has any created_at
    const recencyBonus = candidate.created_at ? 5 : 0;

    // Activity bonus: small bump for teachers who have actually been reviewed before
    const activityBonus = Math.min(ratingCount, 5);

    const total = ratingScore + matchScore + recencyBonus + activityBonus;
    return Math.max(0, Math.min(100, Math.round(total)));
  },
};

function parseDuration(durationStr) {
  // Expect formats like '3 hrs/week' or '2 hrs/month'
  if (!durationStr || typeof durationStr !== 'string') {
    return { hours: null, period: null };
  }
  const m = durationStr.match(/(\d+)\s*hrs?\/(\w+)/i);
  if (!m) return { hours: null, period: null };
  return { hours: parseInt(m[1], 10), period: m[2].toLowerCase() };
}

// DFS-based cycle detection from a starting node
// Finds ALL cycles (not just the first one) from this start node
function detectCyclesFromNode(graph, startNode, maxLength) {
  const cycles = [];
  const path = [];
  const pathSet = new Set();

  function dfs(currentNode, depth) {
    if (depth > maxLength) return;
    
    path.push(currentNode);
    pathSet.add(currentNode);

    const neighbors = graph[currentNode] || [];
    for (const edge of neighbors) {
      const nextNode = edge.toUser;
      
      // Found a cycle back to start (need at least 2 nodes in cycle)
      if (nextNode === startNode && path.length >= 2) {
        const cycle = path.map((nodeId, idx) => {
          // Find the edge FROM this node TO the next node (what they offer)
          const nextNodeId = idx < path.length - 1 ? path[idx + 1] : startNode;
          const edgeToNext = (graph[nodeId] || []).find(e => e.toUser === nextNodeId);
          
          // Find the edge FROM the previous node TO this node (what they receive)
          const prevNodeId = idx === 0 ? path[path.length - 1] : path[idx - 1];
          const edgeFromPrev = (graph[prevNodeId] || []).find(e => e.toUser === nodeId);
          
          return {
            userId: nodeId,
            skill: edgeToNext ? edgeToNext.skill : null,
            wantSkill: edgeFromPrev ? edgeFromPrev.skill : null
          };
        });
        cycles.push(cycle);
        // Do NOT return here — continue DFS to find longer cycles too
      }
      // Continue DFS if not visited in current path
      else if (!pathSet.has(nextNode)) {
        dfs(nextNode, depth + 1);
      }
    }

    path.pop();
    pathSet.delete(currentNode);
  }

  dfs(startNode, 0);
  return cycles;
}

// Normalize cycle to canonical form (start from lexicographically smallest userId)
function normalizeCycle(cycle) {
  if (cycle.length === 0) return [];
  
  let minIndex = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i].userId < cycle[minIndex].userId) {
      minIndex = i;
    }
  }
  
  const normalized = [];
  for (let i = 0; i < cycle.length; i++) {
    normalized.push(cycle[(minIndex + i) % cycle.length].userId);
  }
  return normalized;
}


module.exports = GraphService;
