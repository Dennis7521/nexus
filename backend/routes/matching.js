const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const GraphService = require('../services/GraphService');
const router = express.Router();

// Get potential matches for a user (1-to-1 async matching - Mode A)
router.get('/potential-matches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    // Graph-based matching
    const graph = await GraphService.buildSkillGraph();
    const matches = [];
    
    // Find users who want what this user offers
    if (graph[userId]) {
      graph[userId].forEach(edge => {
        matches.push({
          userId: edge.toUser,
          skill: edge.skill,
          wantSkill: edge.wantSkill,
          score: 0.8 // Default score
        });
      });
    }
    
    res.json({
      matches: matches.slice(0, limit),
      source: 'graph',
      message: 'Graph-based matching'
    });
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Find multi-party cycles (Mode B)
router.get('/cycles', authenticateToken, async (req, res) => {
  try {
    const maxLength = parseInt(req.query.maxLength) || 3;
    const maxResults = parseInt(req.query.maxResults) || 50;
    
    const cycles = await GraphService.findAllCycles(maxLength, maxResults);
    
    res.json({
      cycles,
      count: cycles.length,
      maxLength,
      message: `Found ${cycles.length} exchange cycles`
    });
  } catch (error) {
    console.error('Error finding cycles:', error);
    res.status(500).json({ error: 'Failed to find cycles' });
  }
});

// Get cycles that include the current user
router.get('/my-cycles', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const maxLength = parseInt(req.query.maxLength) || 3;
    const maxResults = parseInt(req.query.maxResults) || 50;
    
    const allCycles = await GraphService.findAllCycles(maxLength, maxResults);
    
    // Filter cycles that include this user
    const myCycles = allCycles.filter(cycle => 
      cycle.some(node => node.userId === userId)
    );
    
    res.json({
      cycles: myCycles,
      count: myCycles.length,
      message: `Found ${myCycles.length} cycles involving you`
    });
  } catch (error) {
    console.error('Error finding user cycles:', error);
    res.status(500).json({ error: 'Failed to find your cycles' });
  }
});

// Validate a specific cycle
router.post('/cycles/validate', authenticateToken, async (req, res) => {
  try {
    const { cycle } = req.body;
    
    if (!cycle || !Array.isArray(cycle)) {
      return res.status(400).json({ error: 'Invalid cycle format' });
    }
    
    const isValid = await GraphService.validateCycle(cycle);
    
    res.json({
      valid: isValid,
      message: isValid ? 'Cycle is valid' : 'Cycle is no longer valid'
    });
  } catch (error) {
    console.error('Error validating cycle:', error);
    res.status(500).json({ error: 'Failed to validate cycle' });
  }
});

// Find teachers for a specific skill
router.get('/teachers/:skillName', authenticateToken, async (req, res) => {
  try {
    const { skillName } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 25;
    
    const teachers = await GraphService.findTeachersForSkill(skillName, userId, limit);
    
    // Score each candidate
    const scoredTeachers = teachers.map(teacher => ({
      ...teacher,
      match_score: GraphService.scoreCandidate(teacher)
    }));
    
    // Sort by score descending
    scoredTeachers.sort((a, b) => b.match_score - a.match_score);
    
    res.json({
      teachers: scoredTeachers,
      count: scoredTeachers.length,
      skill: skillName
    });
  } catch (error) {
    console.error('Error finding teachers:', error);
    res.status(500).json({ error: 'Failed to find teachers' });
  }
});

// Clear graph cache (admin/maintenance endpoint)
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    GraphService.clearCache();
    res.json({ message: 'Graph cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
