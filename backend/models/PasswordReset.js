const { pool } = require('../config/database');

class PasswordReset {
  // Create a new password reset request
  static async createRequest(userId, email, studentId, reason = null) {
    try {
      // Check if user already has a pending request
      const existingRequest = await pool.query(
        `SELECT id FROM password_reset_requests 
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );

      if (existingRequest.rows.length > 0) {
        throw new Error('You already have a pending password reset request');
      }

      const result = await pool.query(
        `INSERT INTO password_reset_requests 
         (user_id, email, student_id, reason, status) 
         VALUES ($1, $2, $3, $4, 'pending') 
         RETURNING *`,
        [userId, email, studentId, reason]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all password reset requests (admin)
  static async getAllRequests(status = null) {
    try {
      let query = `
        SELECT 
          prr.*,
          u.first_name,
          u.last_name,
          u.profile_picture_url,
          a.username as processed_by_username
        FROM password_reset_requests prr
        JOIN users u ON prr.user_id = u.id
        LEFT JOIN admins a ON prr.processed_by = a.id
      `;

      const params = [];
      if (status) {
        query += ' WHERE prr.status = $1';
        params.push(status);
      }

      query += ' ORDER BY prr.requested_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get pending requests count
  static async getPendingCount() {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count 
         FROM password_reset_requests 
         WHERE status = 'pending'`
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Get request by ID
  static async getRequestById(requestId) {
    try {
      const result = await pool.query(
        `SELECT 
          prr.*,
          u.first_name,
          u.last_name,
          u.email as user_email,
          u.profile_picture_url
        FROM password_reset_requests prr
        JOIN users u ON prr.user_id = u.id
        WHERE prr.id = $1`,
        [requestId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Approve request and set temporary password (admin)
  static async approveRequest(requestId, adminId, temporaryPassword, notes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the request
      const requestResult = await client.query(
        'SELECT user_id FROM password_reset_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Password reset request not found');
      }

      const userId = requestResult.rows[0].user_id;

      // Update the request status
      await client.query(
        `UPDATE password_reset_requests 
         SET status = 'approved', 
             processed_at = CURRENT_TIMESTAMP,
             processed_by = $1,
             notes = $2
         WHERE id = $3`,
        [adminId, notes, requestId]
      );

      // Update user's password and set must_change_password flag
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             must_change_password = true 
         WHERE id = $2`,
        [temporaryPassword, userId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Reject request (admin)
  static async rejectRequest(requestId, adminId, notes = null) {
    try {
      await pool.query(
        `UPDATE password_reset_requests 
         SET status = 'rejected', 
             processed_at = CURRENT_TIMESTAMP,
             processed_by = $1,
             notes = $2
         WHERE id = $3`,
        [adminId, notes, requestId]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has must_change_password flag
  static async mustChangePassword(userId) {
    try {
      const result = await pool.query(
        'SELECT must_change_password FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0]?.must_change_password || false;
    } catch (error) {
      throw error;
    }
  }

  // Clear must_change_password flag after user changes password
  static async clearMustChangePassword(userId) {
    try {
      await pool.query(
        'UPDATE users SET must_change_password = false WHERE id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get user's password reset request history
  static async getUserRequestHistory(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          prr.*,
          a.username as processed_by_username
        FROM password_reset_requests prr
        LEFT JOIN admins a ON prr.processed_by = a.id
        WHERE prr.user_id = $1
        ORDER BY prr.requested_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PasswordReset;
