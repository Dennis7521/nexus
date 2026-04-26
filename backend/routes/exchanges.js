const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/database');
const Exchange = require('../models/Exchange');
const ExchangeSession = require('../models/ExchangeSession');
const { authenticateToken } = require('../middleware/auth');

// Get user's exchange requests (frontend expects this endpoint)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get incoming requests (where user is the instructor)
    const incomingResult = await query(
      `SELECT er.*, s.title as skill_title, s.credits_required,
              u.first_name || ' ' || u.last_name as requester_name,
              u.email as requester_email, u.id as requester_id
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u ON er.requester_id = u.id
       WHERE er.instructor_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );
    
    // Get outgoing requests (where user is the requester)
    const outgoingResult = await query(
      `SELECT er.*, s.title as skill_title, s.credits_required,
              u.first_name || ' ' || u.last_name as instructor_name,
              u.email as instructor_email, u.id as instructor_id
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u ON er.instructor_id = u.id
       WHERE er.requester_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );
    
    res.json({
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows
    });
  } catch (error) {
    console.error('Error fetching exchange requests:', error);
    res.status(500).json({ message: 'Failed to fetch exchange requests' });
  }
});

// Get user ID by name
router.get('/find-user/:firstName/:lastName', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.params;
    
    const result = await query(
      'SELECT id, first_name, last_name, email FROM users WHERE first_name = $1 AND last_name = $2',
      [firstName, lastName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ message: 'Failed to find user' });
  }
});

// Create exchange request with escrow
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { skillId, sessionCount = 1, message } = req.body;
    const requesterId = req.user.id;
    
    // Get skill details
    const skillResult = await query(
      'SELECT id, user_id as instructor_id, credits_required FROM skills WHERE id = $1',
      [skillId]
    );
    
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    
    const skill = skillResult.rows[0];
    const totalCredits = parseFloat(skill.credits_required);
    
    // Create exchange request with escrow using model
    const exchange = await Exchange.createRequest({
      skillId: skill.id,
      requesterId,
      instructorId: skill.instructor_id,
      sessionCount,
      message,
      totalCredits
    });
    
    res.status(201).json({
      message: 'Exchange request created successfully',
      exchange
    });
    
  } catch (error) {
    console.error('Error creating exchange request:', error);
    if (error.message === 'Insufficient credits') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create exchange request' });
  }
});

// Get user's exchange requests
router.get('/requests/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get incoming requests (where user is the instructor)
    const incomingResult = await query(
      `SELECT er.*, s.title as skill_title, s.credits_required,
              u.first_name || ' ' || u.last_name as requester_name,
              u.email as requester_email
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u ON er.requester_id = u.id
       WHERE er.instructor_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );
    
    // Get outgoing requests (where user is the requester)
    const outgoingResult = await query(
      `SELECT er.*, s.title as skill_title, s.credits_required,
              u.first_name || ' ' || u.last_name as instructor_name,
              u.email as instructor_email
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u ON er.instructor_id = u.id
       WHERE er.requester_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );
    
    res.json({
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows
    });
  } catch (error) {
    console.error('Error fetching exchange requests:', error);
    res.status(500).json({ message: 'Failed to fetch exchange requests' });
  }
});

// Accept exchange request (no credit transfer, just opens messaging)
router.put('/accept/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const instructorId = req.user.id;
    
    const exchange = await Exchange.acceptRequest(exchangeId, instructorId);
    
    res.json({
      message: 'Exchange request accepted successfully',
      exchange
    });
    
  } catch (error) {
    console.error('Error accepting exchange request:', error);
    res.status(500).json({ message: error.message || 'Failed to accept exchange request' });
  }
});

// Decline exchange request and refund credits
router.put('/decline/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const instructorId = req.user.id;
    
    const result = await Exchange.declineRequest(exchangeId, instructorId);
    
    res.json(result);
  } catch (error) {
    console.error('Error declining exchange request:', error);
    res.status(500).json({ message: error.message || 'Failed to decline exchange request' });
  }
});

// GET /api/exchanges/completed - Get completed async exchanges for current user
router.get('/completed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get completed exchanges where user is either requester or instructor
    const result = await query(
      `SELECT er.id, er.skill_id, s.title as skill_title, er.status, er.created_at, er.updated_at,
              er.requester_id, er.instructor_id,
              CASE 
                WHEN er.requester_id = $1 THEN u2.first_name || ' ' || u2.last_name
                ELSE u1.first_name || ' ' || u1.last_name
              END as partner_name,
              CASE 
                WHEN er.requester_id = $1 THEN 'learned'
                ELSE 'taught'
              END as role
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.instructor_id = u2.id
       WHERE er.status = 'completed'
         AND (er.requester_id = $1 OR er.instructor_id = $1)
       ORDER BY er.updated_at DESC`,
      [userId]
    );
    
    const exchanges = result.rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      skillName: row.skill_title,
      partnerName: row.partner_name,
      role: row.role,
      completedAt: row.updated_at,
      createdAt: row.created_at
    }));
    
    res.json({ exchanges });
  } catch (error) {
    console.error('ERROR: Error fetching completed exchanges:', error);
    res.status(500).json({ message: 'Failed to fetch completed exchanges' });
  }
});

// Complete exchange (mark as completed)
router.put('/complete/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      `UPDATE exchange_requests 
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'accepted' AND (requester_id = $2 OR instructor_id = $2)
       RETURNING *`,
      [exchangeId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exchange request not found or not in accepted state' });
    }
    
    res.json({
      message: 'Exchange marked as completed',
      exchange: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing exchange:', error);
    res.status(500).json({ message: 'Failed to complete exchange' });
  }
});

// Get exchange by ID with details
router.get('/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;
    
    const exchange = await Exchange.getById(exchangeId, userId);
    
    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }
    
    res.json(exchange);
  } catch (error) {
    console.error('Error fetching exchange:', error);
    res.status(500).json({ message: 'Failed to fetch exchange' });
  }
});

// Get all exchanges for current user
router.get('/user/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const exchanges = await Exchange.getByUserId(userId);
    res.json(exchanges);
  } catch (error) {
    console.error('Error fetching user exchanges:', error);
    res.status(500).json({ message: 'Failed to fetch exchanges' });
  }
});

// ========== SESSION MANAGEMENT ENDPOINTS ==========

// Create a new session for an exchange (mentor only)
router.post('/:exchangeId/sessions', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { sessionIndex, scheduledAt, durationMinutes, meetingLink, topicsCovered } = req.body;
    
    const session = await ExchangeSession.createSession({
      exchangeRequestId: exchangeId,
      sessionIndex,
      scheduledAt,
      durationMinutes,
      meetingLink,
      topicsCovered
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: error.message || 'Failed to create session' });
  }
});

// Get all sessions for an exchange
router.get('/:exchangeId/sessions', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const sessions = await ExchangeSession.getByExchangeId(exchangeId);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// Get session by ID
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExchangeSession.getById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Failed to fetch session' });
  }
});

// Update session details (mentor only, before confirmation)
router.put('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    const session = await ExchangeSession.updateSession(sessionId, updates);
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: error.message || 'Failed to update session' });
  }
});

// Confirm session (mentor marks complete)
router.post('/sessions/:sessionId/confirm', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, sessionNotes } = req.body;
    
    const result = await ExchangeSession.confirmSession(sessionId, role, sessionNotes);
    res.json(result);
  } catch (error) {
    console.error('Error confirming session:', error);
    res.status(500).json({ message: error.message || 'Failed to confirm session' });
  }
});

// Verify code (learner enters code)
router.post('/sessions/:sessionId/verify-code', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { verificationCode } = req.body;
    
    const result = await ExchangeSession.verifyCode(sessionId, verificationCode);
    res.json(result);
  } catch (error) {
    console.error('Error verifying code:', error);
    
    // Return 400 for validation errors, 500 for server errors
    const statusCode = error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Failed to verify code' });
  }
});

// Record session join (called when user clicks "Join Session")
router.post('/sessions/:sessionId/join', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Get session with exchange info to determine role
    const sessionResult = await query(
      `SELECT es.*, er.instructor_id, er.requester_id
       FROM exchange_sessions es
       JOIN exchange_requests er ON es.exchange_request_id = er.id
       WHERE es.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const session = sessionResult.rows[0];
    const isMentor = userId === session.instructor_id;
    const isLearner = userId === session.requester_id;

    if (!isMentor && !isLearner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build update fields based on role (only set if not already set)
    // actual_started_at is set on the FIRST join (whoever joins first)
    let updateQuery;
    if (isMentor && !session.mentor_joined_at) {
      updateQuery = `
        UPDATE exchange_sessions
        SET mentor_joined_at = CURRENT_TIMESTAMP,
            actual_started_at = COALESCE(actual_started_at, CURRENT_TIMESTAMP)
        WHERE id = $1
        RETURNING *`;
    } else if (isLearner && !session.learner_joined_at) {
      updateQuery = `
        UPDATE exchange_sessions
        SET learner_joined_at = CURRENT_TIMESTAMP,
            actual_started_at = COALESCE(actual_started_at, CURRENT_TIMESTAMP)
        WHERE id = $1
        RETURNING *`;
    } else {
      return res.json({ message: 'Join already recorded', session });
    }

    const updated = await query(updateQuery, [sessionId]);
    res.json({ message: 'Join recorded', session: updated.rows[0] });

  } catch (error) {
    console.error('Error recording session join:', error);
    res.status(500).json({ message: 'Failed to record join' });
  }
});

// Submit rating for a session (learner only)
router.post('/sessions/:sessionId/rate', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, review } = req.body;
    
    const result = await ExchangeSession.submitRating(sessionId, rating, review);
    res.json(result);
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: error.message || 'Failed to submit rating' });
  }
});

// Submit a review for a completed exchange (learner only, once per exchange)
router.post('/:exchangeId/review', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Get the exchange and verify it is completed and the reviewer is the learner
    const exchangeResult = await query(
      `SELECT er.*, s.title as skill_title
       FROM exchange_requests er
       LEFT JOIN skills s ON er.skill_id = s.id
       WHERE er.id = $1`,
      [exchangeId]
    );

    if (exchangeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exchange not found' });
    }

    const exchange = exchangeResult.rows[0];

    if (exchange.status !== 'completed') {
      return res.status(400).json({ message: 'Exchange must be completed before submitting a review' });
    }

    if (exchange.requester_id !== reviewerId) {
      return res.status(403).json({ message: 'Only the learner can submit a review' });
    }

    // Atomically insert only if no review already exists for this (exchange, reviewer) pair
    const reviewResult = await query(
      `INSERT INTO exchange_reviews
         (exchange_request_id, reviewer_id, reviewee_id, skill_title, rating, comment)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM exchange_reviews
         WHERE exchange_request_id = $1 AND reviewer_id = $2
       )
       RETURNING *`,
      [exchangeId, reviewerId, exchange.instructor_id, exchange.skill_title, rating, comment || null]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(400).json({ message: 'You have already reviewed this exchange' });
    }

    res.status(201).json({
      message: 'Review submitted successfully',
      review: reviewResult.rows[0]
    });

  } catch (error) {
    console.error('Error submitting exchange review:', error);
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

// Get the review for a specific exchange (to check if already reviewed)
router.get('/:exchangeId/review', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM exchange_reviews WHERE exchange_request_id = $1 AND reviewer_id = $2',
      [exchangeId, userId]
    );

    res.json({ review: result.rows[0] || null });
  } catch (error) {
    console.error('Error fetching exchange review:', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

// Cancel a session (before confirmation)
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExchangeSession.cancelSession(sessionId);
    res.json({ message: 'Session cancelled successfully', session });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel session' });
  }
});

module.exports = router;
