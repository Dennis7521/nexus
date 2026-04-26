const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const GraphService = require('../services/GraphService');
const router = express.Router();

// Get all available skills
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let queryText = `
      SELECT 
        s.*,
        u.first_name,
        u.last_name,
        u.student_id,
        u.profile_picture_url,
        s.rating as instructor_rating,
        s.rating_count as instructor_rating_count,
        s.category as category_name
      FROM skills s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true
    `;
    const params = [];
    
    if (category) {
      queryText += ` AND s.category = $${params.length + 1}`;
      params.push(category);
    }
    
    if (search) {
      queryText += ` AND (s.title ILIKE $${params.length + 1} OR s.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    queryText += ` ORDER BY s.created_at DESC`;
    
    const result = await query(queryText, params);
    
    // Transform data to match expected format and add missing fields
    const skills = result.rows.map(skill => ({
      ...skill,
      skill_type: skill.skill_type || 'offer',
      difficulty_level: skill.difficulty_level || 'intermediate',
      time_commitment_hours: skill.time_commitment_hours || parseInt(skill.duration_per_week) || 2,
      time_commitment_period: skill.time_commitment_period || 'week',
      prerequisites: skill.prerequisites || null,
      tags: skill.tags || [],
      // Use skill-specific rating, defaulting to 0 if no ratings yet
      instructor_rating: skill.skill_rating || 0,
      instructor_rating_count: skill.skill_rating_count || 0
    }));
    
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills', details: error.message });
  }
});

// Get skills by user (instructor) - requires authentication
router.get('/my-skills', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT 
        s.*,
        sc.name as category_name,
        COUNT(DISTINCT se.id) as exchange_count
       FROM skills s
       JOIN skill_categories sc ON s.category_id = sc.id
       LEFT JOIN skill_exchanges se ON s.id = se.skill_id
       WHERE s.user_id = $1
       GROUP BY s.id, sc.name
       ORDER BY s.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({ error: 'Failed to fetch user skills' });
  }
});

// Create a new skill - requires authentication
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category_id,
      time_commitment_hours,
      time_commitment_period,
      background_image
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Map category_id to category name
    const categoryMap = {
      '1': 'Programming',
      '2': 'Design',
      '3': 'Mathematics',
      '4': 'Languages',
      '5': 'Business',
      '6': 'Science',
      '7': 'Engineering',
      '8': 'Arts'
    };
    
    const category = categoryMap[category_id] || 'Programming';
    const duration = `${time_commitment_hours} hrs/${time_commitment_period}`;
    
    // Automatic credit calculation based on category
    // Programming, Mathematics, Science, Engineering = 3 credits
    // Design, Languages, Business, Arts = 2 credits
    const highValueCategories = ['Programming', 'Mathematics', 'Science', 'Engineering'];
    const creditsRequired = highValueCategories.includes(category) ? 3 : 2;
    
    const result = await query(
      `INSERT INTO skills (
        user_id,
        title,
        description,
        category,
        duration_per_week,
        location,
        credits_required,
        background_image
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        title,
        description,
        category,
        duration,
        'Online', // Default location
        creditsRequired, // Automatically calculated based on category
        background_image || null
      ]
    );
    
    const createdSkill = result.rows[0];
    
    // Clear graph cache since skills changed
    GraphService.clearCache();
    
    res.status(201).json(createdSkill);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Failed to create skill', details: error.message });
  }
});

// Update a skill - requires authentication
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category_id,
      time_commitment_hours,
      time_commitment_period,
      prerequisites,
      tags,
      background_image
    } = req.body;
    const userId = req.user.id;
    
    // Map category_id to category name
    const categoryMap = {
      '1': 'Programming',
      '2': 'Design',
      '3': 'Mathematics',
      '4': 'Languages',
      '5': 'Business',
      '6': 'Science',
      '7': 'Engineering',
      '8': 'Arts'
    };
    
    const category = categoryMap[category_id] || categoryMap[category_id?.toString()] || 'Programming';
    const duration = `${time_commitment_hours} hrs/${time_commitment_period}`;
    
    const result = await query(
      `UPDATE skills 
       SET title = $1, description = $2, category = $3,
           duration_per_week = $4, time_commitment_hours = $5, time_commitment_period = $6,
           prerequisites = $7, tags = $8, background_image = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [
        title, 
        description, 
        category, 
        duration, 
        time_commitment_hours,
        time_commitment_period,
        prerequisites || null, 
        tags || [], 
        background_image || null, 
        id, 
        userId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found or unauthorized' });
    }
    
    const updatedSkill = result.rows[0];
    
    // Clear graph cache
    GraphService.clearCache();
    
    res.json(updatedSkill);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Failed to update skill', details: error.message });
  }
});

// Delete a skill - requires authentication
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      'DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found or unauthorized' });
    }
    
    // Clear graph cache
    GraphService.clearCache();
    
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// Get personalized skill recommendations (category-based fallback)
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = parseInt(req.query.count) || 10;

    // Find categories the user is interested in via their skills_interested_in array
    const userRes = await query(
      `SELECT skills_interested_in FROM users WHERE id = $1`,
      [userId]
    );
    const interestedIn = userRes.rows[0]?.skills_interested_in || [];

    let result;
    if (interestedIn.length > 0) {
      result = await query(
        `SELECT s.*, u.first_name, u.last_name, s.rating as instructor_rating, s.rating_count as instructor_rating_count
         FROM skills s
         JOIN users u ON s.user_id = u.id
         WHERE s.is_active = true
           AND s.user_id <> $1
           AND EXISTS (
             SELECT 1 FROM unnest($2::text[]) interest
             WHERE LOWER(TRIM(s.title)) LIKE LOWER(TRIM('%' || interest || '%'))
           )
         ORDER BY s.rating DESC NULLS LAST
         LIMIT $3`,
        [userId, interestedIn, count]
      );
    } else {
      result = await query(
        `SELECT s.*, u.first_name, u.last_name, s.rating as instructor_rating, s.rating_count as instructor_rating_count
         FROM skills s
         JOIN users u ON s.user_id = u.id
         WHERE s.is_active = true AND s.user_id <> $1
         ORDER BY s.rating DESC NULLS LAST
         LIMIT $2`,
        [userId, count]
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Track skill view
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Get skill categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name FROM skill_categories ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get recommended skills based on user's exchange request history
router.get('/recommended', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 8;
    
    // Get categories and tags from skills the user has requested exchanges for
    const userInterestsQuery = await query(
      `SELECT DISTINCT s.category, s.tags
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       WHERE er.requester_id = $1`,
      [userId]
    );
    
    if (userInterestsQuery.rows.length === 0) {
      // No exchange history, return empty array
      return res.json([]);
    }
    
    // Extract categories and tags
    const categories = [...new Set(userInterestsQuery.rows.map(row => row.category).filter(Boolean))];
    const allTags = userInterestsQuery.rows
      .flatMap(row => row.tags || [])
      .filter(Boolean);
    const tags = [...new Set(allTags)];
    
    // Build recommendation query
    // Priority: Same category OR matching tags
    let recommendationQuery = `
      SELECT DISTINCT
        s.*,
        u.first_name,
        u.last_name,
        u.student_id,
        u.profile_picture_url,
        s.rating as instructor_rating,
        s.rating_count as instructor_rating_count,
        s.category as category_name,
        -- Calculate relevance score
        CASE 
          WHEN s.category = ANY($1::text[]) THEN 2
          ELSE 0
        END +
        CASE 
          WHEN s.tags && $2::text[] THEN 1
          ELSE 0
        END as relevance_score
      FROM skills s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true
        AND s.user_id != $3
        AND s.id NOT IN (
          SELECT skill_id FROM exchange_requests WHERE requester_id = $3
        )
        AND (
          s.category = ANY($1::text[])
          OR s.tags && $2::text[]
        )
      ORDER BY relevance_score DESC, s.created_at DESC
      LIMIT $4
    `;
    
    const result = await query(recommendationQuery, [
      categories.length > 0 ? categories : [''],
      tags.length > 0 ? tags : [''],
      userId,
      limit
    ]);
    
    // Transform data to match expected format
    const skills = result.rows.map(skill => ({
      ...skill,
      skill_type: skill.skill_type || 'offer',
      difficulty_level: skill.difficulty_level || 'intermediate',
      time_commitment_hours: skill.time_commitment_hours || parseInt(skill.duration_per_week) || 2,
      time_commitment_period: skill.time_commitment_period || 'week',
      location_type: skill.location_type || 'online',
      specific_location: skill.specific_location || skill.location || null,
      prerequisites: skill.prerequisites || null,
      tags: skill.tags || [],
      max_students: skill.max_students || 1
    }));
    
    res.json(skills);
  } catch (error) {
    console.error('Error fetching recommended skills:', error);
    res.status(500).json({ error: 'Failed to fetch recommended skills', details: error.message });
  }
});

module.exports = router;
