const pool = require('../config/database');

class Report {
  /**
   * Create a new report
   */
  static async create({ reporterId, reportedUserId, exchangeId, reason, description }) {
    const query = `
      INSERT INTO reports (reporter_id, reported_user_id, exchange_id, reason, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [reporterId, reportedUserId, exchangeId || null, reason, description || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all reports with user details (for admin)
   */
  static async getAllWithDetails() {
    const query = `
      SELECT 
        r.*,
        reporter.first_name || ' ' || reporter.last_name as reporter_name,
        reporter.email as reporter_email,
        reporter.student_id as reporter_student_id,
        reported.first_name || ' ' || reported.last_name as reported_user_name,
        reported.email as reported_user_email,
        reported.student_id as reported_user_student_id,
        reviewer.username as reviewer_name,
        ex.id as exchange_id,
        s.title as skill_offered_title,
        NULL as skill_requested_title
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      LEFT JOIN admins reviewer ON r.reviewed_by = reviewer.id
      LEFT JOIN exchange_requests ex ON r.exchange_id = ex.id
      LEFT JOIN skills s ON ex.skill_id = s.id
      ORDER BY 
        CASE r.status
          WHEN 'pending' THEN 1
          WHEN 'under_review' THEN 2
          WHEN 'resolved' THEN 3
          WHEN 'dismissed' THEN 4
        END,
        r.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get reports by status
   */
  static async getByStatus(status) {
    const query = `
      SELECT 
        r.*,
        reporter.first_name || ' ' || reporter.last_name as reporter_name,
        reporter.email as reporter_email,
        reported.first_name || ' ' || reported.last_name as reported_user_name,
        reported.email as reported_user_email
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.status = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [status]);
    return result.rows;
  }

  /**
   * Get report by ID with details
   */
  static async getByIdWithDetails(reportId) {
    const query = `
      SELECT 
        r.*,
        reporter.first_name || ' ' || reporter.last_name as reporter_name,
        reporter.email as reporter_email,
        reporter.student_id as reporter_student_id,
        reported.first_name || ' ' || reported.last_name as reported_user_name,
        reported.email as reported_user_email,
        reported.student_id as reported_user_student_id,
        reviewer.username as reviewer_name
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      LEFT JOIN admins reviewer ON r.reviewed_by = reviewer.id
      WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [reportId]);
    return result.rows[0];
  }

  /**
   * Get reports filed by a user
   */
  static async getByReporter(reporterId) {
    const query = `
      SELECT 
        r.*,
        reported.first_name || ' ' || reported.last_name as reported_user_name,
        reported.email as reported_user_email
      FROM reports r
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.reporter_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [reporterId]);
    return result.rows;
  }

  /**
   * Get reports against a user
   */
  static async getByReportedUser(reportedUserId) {
    const query = `
      SELECT 
        r.*,
        reporter.first_name || ' ' || reporter.last_name as reporter_name,
        reporter.email as reporter_email
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      WHERE r.reported_user_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [reportedUserId]);
    return result.rows;
  }

  /**
   * Update report status
   */
  static async updateStatus(reportId, status, reviewerId, adminNotes = null) {
    const query = `
      UPDATE reports
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        admin_notes = COALESCE($3, admin_notes)
      WHERE id = $4
      RETURNING *
    `;
    
    const values = [status, reviewerId, adminNotes, reportId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Add admin notes to a report
   */
  static async addAdminNotes(reportId, adminNotes, reviewerId) {
    const query = `
      UPDATE reports
      SET 
        admin_notes = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const values = [adminNotes, reviewerId, reportId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a report
   */
  static async delete(reportId) {
    const query = 'DELETE FROM reports WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [reportId]);
    return result.rows[0];
  }

  /**
   * Check if user has already reported another user for the same exchange
   */
  static async hasPendingReport(reporterId, reportedUserId, exchangeId) {
    const query = `
      SELECT id FROM reports
      WHERE reporter_id = $1 
        AND reported_user_id = $2 
        AND exchange_id = $3
        AND status = 'pending'
    `;
    
    const result = await pool.query(query, [reporterId, reportedUserId, exchangeId]);
    return result.rows.length > 0;
  }

  /**
   * Get report statistics
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review_reports,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed_reports,
        COUNT(DISTINCT reported_user_id) as total_reported_users
      FROM reports
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Report;
