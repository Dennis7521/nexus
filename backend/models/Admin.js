const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  // Find admin by username
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = true',
      [username]
    );
    return result.rows[0];
  }

  // Find admin by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, created_at, created_by, last_login, is_active FROM admins WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Create new admin
  static async create(username, password, createdBy = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO admins (username, password_hash, created_by, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, username, created_at, is_active`,
      [username, hashedPassword, createdBy]
    );
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update last login
  static async updateLastLogin(id) {
    await pool.query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  // Get all admins
  static async getAll() {
    const result = await pool.query(
      `SELECT id, username, created_at, created_by, last_login, is_active 
       FROM admins 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Deactivate admin
  static async deactivate(id) {
    await pool.query(
      'UPDATE admins SET is_active = false WHERE id = $1',
      [id]
    );
  }

  // Reactivate admin
  static async reactivate(id) {
    await pool.query(
      'UPDATE admins SET is_active = true WHERE id = $1',
      [id]
    );
  }
}

module.exports = Admin;
