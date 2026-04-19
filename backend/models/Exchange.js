const { pool } = require('../config/database');

class Exchange {
  /**
   * Create a new exchange request with credit escrow
   */
  static async createRequest({ skillId, requesterId, instructorId, sessionCount, message, totalCredits }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check user has enough credits (FOR UPDATE serialises concurrent requests from the same user)
      const userResult = await client.query(
        'SELECT time_credits FROM users WHERE id = $1 FOR UPDATE',
        [requesterId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const availableCredits = parseFloat(userResult.rows[0].time_credits);
      
      if (availableCredits < totalCredits) {
        throw new Error('Insufficient credits');
      }
      
      // Determine session count based on credit value
      // 3 credits = 20 sessions, 2 credits = 15 sessions
      const requiredSessionCount = totalCredits === 3 ? 20 : 15;
      
      // Create exchange request (credits stay with user until instructor accepts)
      const exchangeResult = await client.query(
        `INSERT INTO exchange_requests 
         (skill_id, requester_id, instructor_id, status, message, total_credits, escrow_credits, session_count)
         VALUES ($1, $2, $3, 'pending', $4, $5, 0, $6)
         RETURNING *`,
        [skillId, requesterId, instructorId, message, totalCredits, requiredSessionCount]
      );
      
      const exchange = exchangeResult.rows[0];
      
      await client.query('COMMIT');
      return exchange;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Accept an exchange request
   */
  static async acceptRequest(exchangeId, instructorId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get exchange details (FOR UPDATE prevents double-acceptance of the same request)
      const exchangeResult = await client.query(
        `SELECT * FROM exchange_requests 
         WHERE id = $1 AND instructor_id = $2 AND status = 'pending'
         FOR UPDATE`,
        [exchangeId, instructorId]
      );
      
      if (exchangeResult.rows.length === 0) {
        throw new Error('Request not found or already processed');
      }
      
      const exchange = exchangeResult.rows[0];
      
      // Check if learner still has enough credits (FOR UPDATE prevents concurrent deductions)
      const userResult = await client.query(
        'SELECT time_credits FROM users WHERE id = $1 FOR UPDATE',
        [exchange.requester_id]
      );
      
      const availableCredits = parseFloat(userResult.rows[0].time_credits);
      
      if (availableCredits < exchange.total_credits) {
        throw new Error('Learner no longer has sufficient credits');
      }
      
      // Move credits to escrow (deduct from learner balance)
      await client.query(
        'UPDATE users SET time_credits = time_credits - $1 WHERE id = $2',
        [exchange.total_credits, exchange.requester_id]
      );
      
      // Update exchange status and escrow amount
      await client.query(
        `UPDATE exchange_requests 
         SET status = 'accepted', escrow_credits = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [exchange.total_credits, exchangeId]
      );
      
      // Create transaction record for escrow. Credits leave the learner's
      // wallet and sit in a platform escrow "account" (to_user_id = NULL)
      // until released via session_payment / refund / admin action.
      await client.query(
        `INSERT INTO transactions 
         (exchange_request_id, from_user_id, to_user_id, credits, transaction_type, description)
         VALUES ($1, $2, NULL, $3, 'escrow', $4)`,
        [exchangeId, exchange.requester_id, exchange.total_credits,
         `Credits moved to escrow for exchange request`]
      );
      
      // Create initial message
      await client.query(
        `INSERT INTO messages (exchange_request_id, sender_id, receiver_id, content)
         VALUES ($1, $2, $3, $4)`,
        [exchangeId, exchange.instructor_id, exchange.requester_id, 
         'Request accepted! Let\'s schedule our first session.']
      );
      
      await client.query('COMMIT');
      
      // Return updated exchange
      const updatedExchange = await client.query(
        'SELECT * FROM exchange_requests WHERE id = $1',
        [exchangeId]
      );
      
      return updatedExchange.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Decline an exchange request and refund credits
   */
  static async declineRequest(exchangeId, instructorId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get exchange details
      const exchangeResult = await client.query(
        'SELECT * FROM exchange_requests WHERE id = $1 AND instructor_id = $2 AND status = \'pending\'',
        [exchangeId, instructorId]
      );
      
      if (exchangeResult.rows.length === 0) {
        throw new Error('Request not found or already processed');
      }
      
      const exchange = exchangeResult.rows[0];
      
      // Only refund if there are credits in escrow (shouldn't happen for pending requests)
      if (exchange.escrow_credits > 0) {
        // Refund escrow to requester
        await client.query(
          'UPDATE users SET time_credits = time_credits + $1 WHERE id = $2',
          [exchange.escrow_credits, exchange.requester_id]
        );
        
        // Create transaction record for refund. Credits flow from the
        // platform escrow account (from_user_id = NULL) back to the learner.
        await client.query(
          `INSERT INTO transactions 
           (exchange_request_id, from_user_id, to_user_id, credits, transaction_type, description)
           VALUES ($1, NULL, $2, $3, 'refund', $4)`,
          [exchangeId, exchange.requester_id, exchange.escrow_credits,
           `Escrow refund - exchange request declined`]
        );
      }
      
      // Update status
      await client.query(
        `UPDATE exchange_requests 
         SET status = 'declined', escrow_credits = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [exchangeId]
      );
      
      await client.query('COMMIT');
      return { message: 'Request declined' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get exchange by ID with user details
   */
  static async getById(exchangeId, userId) {
    const result = await pool.query(
      `SELECT 
        er.*,
        s.title as skill_title,
        s.description as skill_description,
        requester.first_name || ' ' || requester.last_name as requester_name,
        requester.email as requester_email,
        requester.profile_picture_url as requester_picture,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        instructor.email as instructor_email,
        instructor.profile_picture_url as instructor_picture
       FROM exchange_requests er
       LEFT JOIN skills s ON er.skill_id = s.id
       LEFT JOIN users requester ON er.requester_id = requester.id
       LEFT JOIN users instructor ON er.instructor_id = instructor.id
       WHERE er.id = $1 AND (er.requester_id = $2 OR er.instructor_id = $2)`,
      [exchangeId, userId]
    );
    
    return result.rows[0];
  }

  /**
   * Get all exchanges for a user
   */
  static async getByUserId(userId) {
    const result = await pool.query(
      `SELECT 
        er.*,
        s.title as skill_title,
        CASE 
          WHEN er.requester_id = $1 THEN instructor.first_name || ' ' || instructor.last_name
          ELSE requester.first_name || ' ' || requester.last_name
        END as partner_name,
        CASE 
          WHEN er.requester_id = $1 THEN instructor.profile_picture_url
          ELSE requester.profile_picture_url
        END as partner_picture,
        CASE 
          WHEN er.requester_id = $1 THEN 'learner'
          ELSE 'mentor'
        END as user_role
       FROM exchange_requests er
       LEFT JOIN skills s ON er.skill_id = s.id
       LEFT JOIN users requester ON er.requester_id = requester.id
       LEFT JOIN users instructor ON er.instructor_id = instructor.id
       WHERE er.requester_id = $1 OR er.instructor_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );
    
    return result.rows;
  }

  /**
   * Get pending requests for instructor
   */
  static async getPendingRequests(instructorId) {
    const result = await pool.query(
      `SELECT 
        er.*,
        s.title as skill_title,
        requester.first_name || ' ' || requester.last_name as requester_name,
        requester.email as requester_email,
        requester.profile_picture_url as requester_picture
       FROM exchange_requests er
       LEFT JOIN skills s ON er.skill_id = s.id
       LEFT JOIN users requester ON er.requester_id = requester.id
       WHERE er.instructor_id = $1 AND er.status = 'pending'
       ORDER BY er.created_at DESC`,
      [instructorId]
    );
    
    return result.rows;
  }
}

module.exports = Exchange;
