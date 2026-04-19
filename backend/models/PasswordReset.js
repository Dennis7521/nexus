const { pool } = require('../config/database');

class PasswordReset {
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
}

module.exports = PasswordReset;
