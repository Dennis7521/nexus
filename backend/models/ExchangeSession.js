const { pool } = require('../config/database');
const { generateJitsiRoom } = require('../utils/jitsi');

class ExchangeSession {
  /**
   * Generate a unique verification code (format: ABC-123-XYZ)
   */
  static generateVerificationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars (O, 0, I, 1)
    let code = '';
    for (let i = 0; i < 11; i++) {
      if (i === 3 || i === 7) {
        code += '-';
      } else {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return code; // Format: ABC-DEF-GHI (3-3-3)
  }

  /**
   * Create a new session for an exchange
   */
  static async createSession({ 
    exchangeRequestId, 
    sessionIndex, 
    scheduledAt, 
    durationMinutes, 
    meetingLink, 
    topicsCovered 
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get exchange details
      const exchangeResult = await client.query(
        'SELECT total_credits, session_count, escrow_credits FROM exchange_requests WHERE id = $1',
        [exchangeRequestId]
      );
      
      if (exchangeResult.rows.length === 0) {
        throw new Error('Exchange not found');
      }
      
      const exchange = exchangeResult.rows[0];
      
      // Validate session index
      if (sessionIndex > exchange.session_count || sessionIndex < 1) {
        throw new Error('Invalid session index');
      }
      
      // Check if session already exists
      const existingSession = await client.query(
        'SELECT id FROM exchange_sessions WHERE exchange_request_id = $1 AND session_index = $2',
        [exchangeRequestId, sessionIndex]
      );
      
      if (existingSession.rows.length > 0) {
        throw new Error('Session already exists for this index');
      }
      
      // Calculate credit share (final session gets exact remainder)
      const creditShare = sessionIndex === exchange.session_count
        ? parseFloat(exchange.escrow_credits) // Remaining escrow
        : Math.floor((parseFloat(exchange.total_credits) / exchange.session_count) * 1000) / 1000;
      
      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      
      // Auto-generate Jitsi room if no meeting link provided
      const resolvedMeetingLink = meetingLink || generateJitsiRoom();
      
      // Create session
      const sessionResult = await client.query(
        `INSERT INTO exchange_sessions 
         (exchange_request_id, session_index, scheduled_at, duration_minutes, credit_share, 
          verification_code, meeting_link, topics_covered)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [exchangeRequestId, sessionIndex, scheduledAt, durationMinutes, creditShare, 
         verificationCode, resolvedMeetingLink, topicsCovered]
      );
      
      await client.query('COMMIT');
      return sessionResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm session (mentor marks complete)
   */
  static async confirmSession(sessionId, role, sessionNotes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock session row
      const sessionResult = await client.query(
        'SELECT * FROM exchange_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessionResult.rows[0];
      
      // Update confirmation based on role
      if (role === 'mentor') {
        // Record actual end time when mentor confirms the session completed.
        // actual_started_at = earliest of the two join timestamps (or now if neither recorded yet).
        // actual_ended_at   = now (mentor marking complete = session ended).
        // actual_duration   = ended - started, in whole minutes.
        await client.query(
          `UPDATE exchange_sessions
           SET mentor_confirmed = TRUE,
               mentor_confirmed_at = CURRENT_TIMESTAMP,
               mentor_joined_at = COALESCE(mentor_joined_at, CURRENT_TIMESTAMP),
               session_notes = COALESCE($2, session_notes),
               actual_started_at = COALESCE(actual_started_at, CURRENT_TIMESTAMP),
               actual_ended_at = CURRENT_TIMESTAMP,
               actual_duration_minutes = CASE
                 WHEN actual_started_at IS NOT NULL
                 THEN GREATEST(1, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - actual_started_at))::INTEGER / 60)
                 ELSE 0
               END
           WHERE id = $1`,
          [sessionId, sessionNotes]
        );
      } else if (role === 'learner') {
        await client.query(
          `UPDATE exchange_sessions 
           SET learner_confirmed = TRUE, 
               learner_confirmed_at = CURRENT_TIMESTAMP,
               learner_joined_at = COALESCE(learner_joined_at, CURRENT_TIMESTAMP)
           WHERE id = $1`,
          [sessionId]
        );
      }
      
      // Check if both confirmed
      const updatedSession = await client.query(
        'SELECT * FROM exchange_sessions WHERE id = $1',
        [sessionId]
      );
      
      const sessionUpdated = updatedSession.rows[0];
      
      // If both confirmed, release credits
      if (sessionUpdated.mentor_confirmed && sessionUpdated.learner_confirmed) {
        await this.releaseCredits(client, sessionUpdated);
      }
      
      await client.query('COMMIT');
      return { 
        message: 'Session confirmed',
        bothConfirmed: sessionUpdated.mentor_confirmed && sessionUpdated.learner_confirmed,
        session: sessionUpdated
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify code and confirm for learner
   */
  static async verifyCode(sessionId, verificationCode) {
    console.log('verifyCode called with:', { sessionId, verificationCode });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock session row
      console.log('Querying session:', sessionId);
      const sessionResult = await client.query(
        'SELECT * FROM exchange_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      console.log('Session query result:', sessionResult.rows.length, 'rows');
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessionResult.rows[0];
      
      // Validate code (case-insensitive, trim whitespace)
      const submittedCode = verificationCode.toUpperCase().trim();
      const storedCode = session.verification_code;
      
      console.log('Code verification attempt:');
      console.log('  Submitted:', submittedCode);
      console.log('  Stored:', storedCode);
      console.log('  Match:', submittedCode === storedCode);
      
      if (storedCode !== submittedCode) {
        // Track attempts for analytics but don't limit them
        await client.query(
          'UPDATE exchange_sessions SET code_attempts = code_attempts + 1 WHERE id = $1',
          [sessionId]
        );
        await client.query('COMMIT');
        
        throw new Error('Invalid verification code. Please try again.');
      }
      
      // Code is valid - auto-confirm for learner
      await client.query(
        `UPDATE exchange_sessions 
         SET learner_confirmed = TRUE, 
             learner_confirmed_at = CURRENT_TIMESTAMP,
             learner_joined_at = COALESCE(learner_joined_at, CURRENT_TIMESTAMP)
         WHERE id = $1`,
        [sessionId]
      );
      
      // Check if both confirmed
      const updatedSession = await client.query(
        'SELECT * FROM exchange_sessions WHERE id = $1',
        [sessionId]
      );
      
      const sessionUpdated = updatedSession.rows[0];
      
      if (sessionUpdated.mentor_confirmed && sessionUpdated.learner_confirmed) {
        await this.releaseCredits(client, sessionUpdated);
      }
      
      await client.query('COMMIT');
      return { 
        message: 'Code verified successfully',
        bothConfirmed: sessionUpdated.mentor_confirmed && sessionUpdated.learner_confirmed,
        session: sessionUpdated
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release credits to instructor (internal helper)
   */
  static async releaseCredits(client, session) {
    // Get exchange details
    const exchangeResult = await client.query(
      'SELECT * FROM exchange_requests WHERE id = $1',
      [session.exchange_request_id]
    );
    const exchange = exchangeResult.rows[0];
    
    // Convert credit_share to number (handles both string and numeric types)
    const creditsToRelease = parseFloat(session.credit_share);
    
    // Release credits to instructor
    await client.query(
      'UPDATE users SET time_credits = time_credits + $1 WHERE id = $2',
      [creditsToRelease, exchange.instructor_id]
    );
    
    // Reduce escrow
    await client.query(
      'UPDATE exchange_requests SET escrow_credits = escrow_credits - $1 WHERE id = $2',
      [creditsToRelease, session.exchange_request_id]
    );
    
    // Mark session complete
    await client.query(
      `UPDATE exchange_sessions 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [session.id]
    );
    
    // Create transaction record. Credits flow from the platform escrow
    // account (from_user_id = NULL) to the instructor's wallet.
    await client.query(
      `INSERT INTO transactions 
       (exchange_request_id, from_user_id, to_user_id, credits, transaction_type, description)
       VALUES ($1, NULL, $2, $3, 'session_payment', $4)`,
      [session.exchange_request_id, exchange.instructor_id,
       session.credit_share, `Session ${session.session_index} payment`]
    );
    
    // Check if all sessions complete
    const completedCount = await client.query(
      'SELECT COUNT(*) FROM exchange_sessions WHERE exchange_request_id = $1 AND status = \'completed\'',
      [session.exchange_request_id]
    );
    
    if (parseInt(completedCount.rows[0].count) === exchange.session_count) {
      await client.query(
        'UPDATE exchange_requests SET status = \'completed\' WHERE id = $1',
        [session.exchange_request_id]
      );
    }
  }

  /**
   * Submit rating for a session
   */
  static async submitRating(sessionId, rating, review = null) {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const result = await pool.query(
      `UPDATE exchange_sessions 
       SET learner_rating = $1, learner_review = $2
       WHERE id = $3 AND status = 'completed'
       RETURNING *`,
      [rating, review, sessionId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or not completed');
    }
    
    return { message: 'Rating submitted successfully', session: result.rows[0] };
  }

  /**
   * Get all sessions for an exchange
   */
  static async getByExchangeId(exchangeRequestId) {
    const result = await pool.query(
      `SELECT * FROM exchange_sessions 
       WHERE exchange_request_id = $1 
       ORDER BY session_index ASC`,
      [exchangeRequestId]
    );
    
    return result.rows;
  }

  /**
   * Get session by ID
   */
  static async getById(sessionId) {
    const result = await pool.query(
      'SELECT * FROM exchange_sessions WHERE id = $1',
      [sessionId]
    );
    
    return result.rows[0];
  }

  /**
   * Update session details (mentor only, before confirmation)
   */
  static async updateSession(sessionId, updates) {
    const { scheduledAt, durationMinutes, meetingLink, topicsCovered } = updates;
    
    const result = await pool.query(
      `UPDATE exchange_sessions 
       SET scheduled_at = COALESCE($2, scheduled_at),
           duration_minutes = COALESCE($3, duration_minutes),
           meeting_link = COALESCE($4, meeting_link),
           topics_covered = COALESCE($5, topics_covered)
       WHERE id = $1 AND mentor_confirmed = FALSE
       RETURNING *`,
      [sessionId, scheduledAt, durationMinutes, meetingLink, topicsCovered]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or already confirmed');
    }
    
    return result.rows[0];
  }

  /**
   * Cancel a session (before confirmation)
   */
  static async cancelSession(sessionId) {
    const result = await pool.query(
      `UPDATE exchange_sessions 
       SET status = 'cancelled'
       WHERE id = $1 AND mentor_confirmed = FALSE AND learner_confirmed = FALSE
       RETURNING *`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or already confirmed');
    }
    
    return result.rows[0];
  }
}

module.exports = ExchangeSession;
