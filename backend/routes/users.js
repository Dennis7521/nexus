const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Helper to get full profile picture URL
const getProfilePictureUrl = (relativePath, req) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

// Helper to get full transcript URL
const getTranscriptUrl = (relativePath, req) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

// GET /api/users/:userId
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        degreeProgram: user.degree_program,
        yearOfStudy: user.year_of_study,
        profilePictureUrl: getProfilePictureUrl(user.profile_picture_url, req),
        transcriptUrl: getTranscriptUrl(user.transcript_url, req),
        timeCredits: user.time_credits,
        totalRating: user.total_rating,
        ratingCount: user.rating_count,
        skillsPossessing: user.skills_possessing || [],
        skillsInterestedIn: user.skills_interested_in || [],
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// GET /api/users/:userId/stats
router.get('/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await User.getUserStats(req.params.userId);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user stats', error: error.message });
  }
});

// GET /api/users/:userId/skills
router.get('/:userId/skills', authenticateToken, async (req, res) => {
  try {
    const skills = await User.getUserOfferedSkills(req.params.userId);
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user skills', error: error.message });
  }
});

// GET /api/users/:userId/reviews
router.get('/:userId/reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await User.getUserReviews(req.params.userId);
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user reviews', error: error.message });
  }
});

module.exports = router;
