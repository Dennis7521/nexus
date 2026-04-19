const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/adminAuth');
const Admin = require('../models/Admin');
const Report = require('../models/Report');
const fs = require('fs');
const path = require('path');
const { generateAsyncMatchesForAllUsers, detectCyclesForAllUsers, runAllMatchingJobs } = require('../jobs/matchingJobs');

// Admin login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find admin in database
    const admin = await Admin.findByUsername(username);
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Verify password
    const isValidPassword = await Admin.verifyPassword(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Update last login
    await Admin.updateLastLogin(admin.id);

    // Generate a token for the admin (use admin ID instead of 'admin')
    const token = generateToken(admin.id);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all users (admin only)
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        student_id, 
        created_at,
        profile_picture_url,
        COALESCE(is_suspended, false) as is_suspended
      FROM users 
      ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Reset user password (admin only)
router.post('/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Suspend or reactivate user account (admin only)
router.post('/suspend-account', authenticateAdmin, async (req, res) => {
  try {
    const { userId, suspend } = req.body;

    if (!userId || suspend === undefined) {
      return res.status(400).json({ error: 'User ID and suspend status are required' });
    }

    // Check if is_suspended column exists, if not add it
    const columnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name = 'is_suspended'`
    );

    if (columnCheck.rows.length === 0) {
      // Add the column if it doesn't exist
      await pool.query(
        'ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT false'
      );
    }

    // Update the user's suspension status
    await pool.query(
      'UPDATE users SET is_suspended = $1 WHERE id = $2',
      [suspend, userId]
    );

    res.json({ 
      message: suspend ? 'Account suspended successfully' : 'Account reactivated successfully' 
    });
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ error: 'Failed to update account status' });
  }
});

// Test route to verify admin auth is working
router.get('/test', authenticateAdmin, (req, res) => {
  console.log('=== ADMIN TEST ROUTE HIT ===');
  res.json({ message: 'Admin authentication working', admin: req.admin });
});

// Create new admin account (admin only)
router.post('/create-admin', authenticateAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existingAdmin = await Admin.findByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new admin (created_by is the current admin's ID)
    const newAdmin = await Admin.create(username, password, req.admin.id);

    res.status(201).json({
      message: 'Admin account created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        created_at: newAdmin.created_at
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

// Get all admin accounts (admin only)
router.get('/admins', authenticateAdmin, async (req, res) => {
  try {
    const admins = await Admin.getAll();
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admin accounts' });
  }
});

// Delete user account (admin only)
router.delete('/delete-account', authenticateAdmin, async (req, res) => {
  console.log('=== DELETE ACCOUNT ROUTE HIT ===');
  console.log('Request body:', req.body);
  console.log('Admin user:', req.admin);
  console.log('User ID to delete:', req.body.userId);
  
  const client = await pool.connect();
  
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await client.query('BEGIN');

    console.log(`Starting deletion process for user ID: ${userId}`);

    // Helper function to safely delete from a table
    const safeDelete = async (tableName, condition, params) => {
      // Use savepoint to prevent transaction abort on error
      const savepointName = `sp_${tableName}_${Date.now()}`;
      try {
        await client.query(`SAVEPOINT ${savepointName}`);
        const result = await client.query(`DELETE FROM ${tableName} WHERE ${condition}`, params);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        console.log(`Deleted ${result.rowCount} rows from ${tableName}`);
        return result.rowCount;
      } catch (err) {
        // Rollback to savepoint to keep transaction alive
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        
        // If table doesn't exist (42P01) or column doesn't exist (42703), just log and continue
        if (err.code === '42P01') {
          console.log(`Table ${tableName} does not exist, skipping...`);
          return 0;
        }
        if (err.code === '42703') {
          console.log(`Column in ${tableName} does not exist (${err.message}), skipping...`);
          return 0;
        }
        throw err;
      }
    };

    // Delete related records first (foreign key constraints)
    // Delete in order to respect foreign key dependencies
    
    // 1. Delete user's messages
    await safeDelete('messages', 'sender_id = $1 OR receiver_id = $1', [userId]);
    
    // 3. Delete user's exchange requests
    await safeDelete('exchange_requests', 'requester_id = $1 OR instructor_id = $1', [userId]);
    
    // 4. Delete user's skill matches
    await safeDelete('skill_matches', 'user_id = $1 OR matched_user_id = $1', [userId]);
    
    // 5. Delete user's skills
    await safeDelete('skills', 'user_id = $1', [userId]);
    
    // 6. Delete user's transactions
    await safeDelete('transactions', 'from_user_id = $1 OR to_user_id = $1', [userId]);
    
    // 7. Delete user's OTPs
    await safeDelete('otps', 'user_id = $1', [userId]);

    // 8. Delete user's profile picture if it exists
    const userResult = await client.query('SELECT profile_picture_url FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].profile_picture_url) {
      const picturePath = path.join(__dirname, '..', userResult.rows[0].profile_picture_url);
      try {
        if (fs.existsSync(picturePath)) {
          fs.unlinkSync(picturePath);
          console.log('Deleted profile picture:', picturePath);
        }
      } catch (err) {
        console.log('Could not delete profile picture:', err.message);
      }
    }

    // 9. Finally, delete the user
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Deleted user');

    await client.query('COMMIT');
    console.log(`Successfully deleted user ID: ${userId}`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting account:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});


// ==================== REPORT MANAGEMENT ROUTES ====================

/**
 * GET /api/admin/reports
 * Get all reports with details (admin only)
 */
router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let reports;
    if (status) {
      reports = await Report.getByStatus(status);
    } else {
      reports = await Report.getAllWithDetails();
    }
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/admin/reports/statistics
 * Get report statistics (admin only)
 */
router.get('/reports/statistics', authenticateAdmin, async (req, res) => {
  try {
    const stats = await Report.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/admin/reports/:reportId
 * Get a specific report by ID (admin only)
 */
router.get('/reports/:reportId', authenticateAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.getByIdWithDetails(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

/**
 * PUT /api/admin/reports/:reportId/status
 * Update report status (admin only)
 */
router.put('/reports/:reportId/status', authenticateAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const validStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const updatedReport = await Report.updateStatus(
      reportId,
      status,
      req.admin.id,
      adminNotes || null
    );
    
    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({
      message: 'Report status updated successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

/**
 * PUT /api/admin/reports/:reportId/notes
 * Add or update admin notes on a report (admin only)
 */
router.put('/reports/:reportId/notes', authenticateAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adminNotes } = req.body;
    
    if (!adminNotes) {
      return res.status(400).json({ error: 'Admin notes are required' });
    }
    
    const updatedReport = await Report.addAdminNotes(
      reportId,
      adminNotes,
      req.admin.id
    );
    
    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({
      message: 'Admin notes added successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error adding admin notes:', error);
    res.status(500).json({ error: 'Failed to add admin notes' });
  }
});

/**
 * DELETE /api/admin/reports/:reportId
 * Delete a report (admin only)
 */
router.delete('/reports/:reportId', authenticateAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const deletedReport = await Report.delete(reportId);
    
    if (!deletedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

/**
 * POST /api/admin/send-message
 * Send a message to a user as "NEXUS Admin" (admin only)
 */
router.post('/send-message', authenticateAdmin, async (req, res) => {
  try {
    const { recipientId, message, reportId } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({ error: 'Recipient ID and message are required' });
    }

    // Create a special admin user ID for "NEXUS Admin"
    // We'll use a fixed UUID that represents the system admin
    const NEXUS_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

    // Insert the message into the messages table
    // The message will appear as coming from NEXUS Admin with no exchange_request_id
    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, exchange_request_id, is_read, created_at)
       VALUES ($1, $2, $3, NULL, false, NOW())`,
      [NEXUS_ADMIN_ID, recipientId, message]
    );

    // Optionally, log this admin action in the report if reportId is provided
    if (reportId) {
      // Get recipient name and admin username
      const recipientResult = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [recipientId]
      );
      const recipientName = recipientResult.rows[0] 
        ? `${recipientResult.rows[0].first_name} ${recipientResult.rows[0].last_name}`
        : 'User';

      const adminResult = await pool.query(
        'SELECT username FROM admins WHERE id = $1',
        [req.admin.id]
      );
      const adminUsername = adminResult.rows[0]?.username || 'Admin';

      // Format: [timestamp] Admin (username) contacted recipient: message
      await pool.query(
        `UPDATE reports 
         SET admin_notes = COALESCE(admin_notes, '') || E'\n[' || NOW() || '] Admin (' || $1 || ') contacted ' || $2 || ': ' || $3
         WHERE id = $4`,
        [adminUsername, recipientName, message.substring(0, 200) + (message.length > 200 ? '...' : ''), reportId]
      );
    }

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/admin/reports/:reportId/messages
 * Get all NEXUS Admin messages related to a report (admin only)
 */
router.get('/reports/:reportId/messages', authenticateAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const NEXUS_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

    // Get report details to find reporter and reported user
    const reportResult = await pool.query(
      'SELECT reporter_id, reported_user_id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { reporter_id, reported_user_id } = reportResult.rows[0];

    // Get all messages sent by NEXUS Admin to either the reporter or reported user
    const messagesResult = await pool.query(
      `SELECT 
         m.id,
         m.content,
         m.created_at,
         m.receiver_id,
         u.first_name || ' ' || u.last_name as recipient_name
       FROM messages m
       JOIN users u ON m.receiver_id = u.id
       WHERE m.sender_id = $1
         AND m.receiver_id IN ($2, $3)
       ORDER BY m.created_at ASC`,
      [NEXUS_ADMIN_ID, reporter_id, reported_user_id]
    );

    // Format the messages for the frontend
    const messageLog = messagesResult.rows.map(msg => ({
      timestamp: msg.created_at,
      recipient: msg.recipient_name,
      message: msg.content,
      admin: 'NEXUS Admin' // We don't track which specific admin sent it from messages table
    }));

    res.json(messageLog);
  } catch (error) {
    console.error('Error fetching message log:', error);
    res.status(500).json({ error: 'Failed to fetch message log' });
  }
});

/**
 * GET /api/admin/analytics
 * Get platform analytics and statistics (admin only)
 */
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    // Get total users count
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get active exchanges count (async: status = 'accepted' or 'in_progress', sync: status = 'active' or 'pending')
    const asyncExchangesResult = await pool.query(
      `SELECT COUNT(*) as count FROM exchange_requests 
       WHERE status IN ('accepted', 'in_progress')`
    );
    const syncExchangesResult = await pool.query(
      `SELECT COUNT(*) as count FROM exchange_cycles 
       WHERE status IN ('active', 'pending', 'proposed')`
    );
    const activeExchanges = parseInt(asyncExchangesResult.rows[0].count) + parseInt(syncExchangesResult.rows[0].count);

    // Get total skills count
    const skillsResult = await pool.query('SELECT COUNT(*) as count FROM skills');
    const totalSkills = parseInt(skillsResult.rows[0].count);

    // Get completed sessions count
    const sessionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM exchange_sessions 
       WHERE status = 'completed'`
    );
    const completedSessions = parseInt(sessionsResult.rows[0].count);

    res.json({
      totalUsers,
      activeExchanges,
      totalSkills,
      completedSessions
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/admin/analytics/exchanges
 * Get detailed active exchanges data (admin only) - includes async and sync exchanges
 */
router.get('/analytics/exchanges', authenticateAdmin, async (req, res) => {
  try {
    // Get async exchanges (credit-based, one-to-one)
    const asyncResult = await pool.query(
      `SELECT 
        er.id,
        er.status,
        er.created_at,
        s.title as skill_title,
        s.category_id,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as credits_required,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture,
        'async' as exchange_type
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       WHERE er.status IN ('accepted', 'in_progress')
       ORDER BY er.created_at DESC
       LIMIT 20`
    );

    // Get sync exchange cycles (exchange_mode = 'sync', credit-free)
    const syncPairsResult = await pool.query(
      `WITH cycle_participants_expanded AS (
         SELECT 
           ec.id as cycle_id,
           ec.status,
           ec.created_at,
           ec.cycle_data,
           ec.cycle_length,
           cp.user_id,
           cp.position_in_cycle,
           cp.skill_offering,
           cp.skill_receiving,
           u.first_name || ' ' || u.last_name as user_name,
           u.profile_picture_url as user_picture
         FROM exchange_cycles ec
         JOIN cycle_participants cp ON cp.cycle_id = ec.id
         JOIN users u ON u.id = cp.user_id
         WHERE ec.exchange_mode = 'sync'
           AND ec.status IN ('active', 'pending', 'proposed')
       ),
       paired_cycles AS (
         SELECT 
           c1.cycle_id as id,
           c1.status,
           c1.created_at,
           CASE 
             WHEN c1.cycle_length = 2 THEN c1.skill_offering || ' ↔ ' || c2.skill_offering
             ELSE c1.skill_offering || ' + ' || (c1.cycle_length - 1)::text || ' more skills'
           END as skill_title,
           NULL as category_id,
           0 as credits_required,
           c1.user_name as requester_name,
           c2.user_name as instructor_name,
           c1.user_picture as requester_picture,
           c2.user_picture as instructor_picture,
           'sync' as exchange_type
         FROM cycle_participants_expanded c1
         JOIN cycle_participants_expanded c2 ON c1.cycle_id = c2.cycle_id AND c1.position_in_cycle = 0 AND c2.position_in_cycle = 1
       )
       SELECT * FROM paired_cycles
       ORDER BY created_at DESC
       LIMIT 20`
    );

    // Get completed async exchanges
    const completedAsyncResult = await pool.query(
      `SELECT 
        er.id,
        er.status,
        er.created_at,
        er.updated_at as completed_at,
        s.title as skill_title,
        s.category_id,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as credits_required,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture,
        'async' as exchange_type
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       WHERE er.status = 'completed'
       ORDER BY er.updated_at DESC
       LIMIT 30`
    );

    // Get terminated async exchanges
    const terminatedAsyncResult = await pool.query(
      `SELECT 
        er.id,
        er.status,
        er.created_at,
        er.updated_at as terminated_at,
        s.title as skill_title,
        s.category_id,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as credits_required,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture,
        'async' as exchange_type
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       WHERE er.status = 'terminated'
       ORDER BY er.updated_at DESC
       LIMIT 30`
    );

    // Get completed sync cycles
    const completedSyncResult = await pool.query(
      `WITH cycle_participants_expanded AS (
         SELECT 
           ec.id as cycle_id,
           ec.status,
           ec.created_at,
           ec.updated_at as completed_at,
           cp.skill_offering,
           ec.cycle_length,
           u.first_name || ' ' || u.last_name as user_name,
           u.profile_picture_url as user_picture,
           cp.position_in_cycle
         FROM exchange_cycles ec
         JOIN cycle_participants cp ON cp.cycle_id = ec.id
         JOIN users u ON u.id = cp.user_id
         WHERE ec.exchange_mode = 'sync' AND ec.status = 'completed'
       )
       SELECT 
         c1.cycle_id as id, c1.status, c1.created_at, c1.completed_at,
         CASE WHEN c1.cycle_length = 2 THEN c1.skill_offering || ' ↔ ' || c2.skill_offering
              ELSE c1.skill_offering || ' + ' || (c1.cycle_length - 1)::text || ' more skills' END as skill_title,
         NULL as category_id, 0 as credits_required,
         c1.user_name as requester_name, c2.user_name as instructor_name,
         c1.user_picture as requester_picture, c2.user_picture as instructor_picture,
         'sync' as exchange_type
       FROM cycle_participants_expanded c1
       JOIN cycle_participants_expanded c2 ON c1.cycle_id = c2.cycle_id AND c1.position_in_cycle = 0 AND c2.position_in_cycle = 1
       ORDER BY c1.completed_at DESC LIMIT 30`
    );

    // Combine and sort by created_at
    const active = [...asyncResult.rows, ...syncPairsResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30);

    const completed = [...completedAsyncResult.rows, ...completedSyncResult.rows]
      .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
      .slice(0, 30);

    const terminated = [...terminatedAsyncResult.rows]
      .sort((a, b) => new Date(b.terminated_at || b.created_at) - new Date(a.terminated_at || a.created_at))
      .slice(0, 30);

    res.json({ active, completed, terminated });
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    res.json({ active: [], completed: [], terminated: [] });
  }
});

/**
 * GET /api/admin/analytics/skills
 * Get detailed skills data with request counts (admin only)
 */
router.get('/analytics/skills', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.id,
        s.title,
        s.skill_type,
        s.category_id,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as credits_required,
        s.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        u.profile_picture_url as user_picture,
        COUNT(er.id) as request_count
       FROM skills s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       LEFT JOIN exchange_requests er ON s.id = er.skill_id
       GROUP BY s.id, s.title, s.skill_type, s.category_id, s.credits_required, s.created_at, 
                u.first_name, u.last_name, u.profile_picture_url, sc.name
       ORDER BY request_count DESC, s.created_at DESC
       LIMIT 20`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * GET /api/admin/analytics/sessions
 * Get detailed completed sessions data (admin only)
 */
router.get('/analytics/sessions', authenticateAdmin, async (req, res) => {
  try {
    // Check if exchange_sessions table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exchange_sessions'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ active: [], completed: [], terminated: [] });
    }
    
    const asyncResult = await pool.query(
      `SELECT 
        er.id as exchange_id,
        s.title as skill_title,
        'async' as session_type,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as total_credits,
        COALESCE(er.session_count, 
          CASE 
            WHEN COALESCE(s.credits_required, 
              CASE 
                WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
                ELSE 2
              END
            ) = 3 THEN 20
            ELSE 15
          END
        ) as total_sessions,
        COUNT(es.id) FILTER (WHERE es.status = 'completed') as completed_sessions,
        COALESCE(SUM(es.credit_share) FILTER (WHERE es.status = 'completed'), 0) as credits_released,
        COALESCE(er.escrow_credits, 0) as credits_in_escrow,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       LEFT JOIN exchange_sessions es ON er.id = es.exchange_request_id
       WHERE er.status IN ('accepted', 'in_progress')
       GROUP BY er.id, s.title, s.credits_required, sc.name, er.session_count,
                requester.first_name, requester.last_name, requester.profile_picture_url,
                instructor.first_name, instructor.last_name, instructor.profile_picture_url
       ORDER BY er.created_at DESC
       LIMIT 20`
    );

    // Check if sync_exchange_sessions table exists
    const syncTableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sync_exchange_sessions'
      )`
    );

    let syncRows = [];
    if (syncTableCheck.rows[0].exists) {
      const syncResult = await pool.query(
        `SELECT
          ec.id || '-' || cp_teacher.position_in_cycle::text as exchange_id,
          'sync' as session_type,
          cp_teacher.skill_offering as skill_title,
          cp_teacher.position_in_cycle as pair_index,
          COALESCE((ec.pair_session_counts->>cp_teacher.position_in_cycle::text)::int, ec.session_count, 0) as total_sessions,
          COUNT(ses.id) FILTER (WHERE ses.status = 'completed' AND ses.skill_pair_index = cp_teacher.position_in_cycle) as completed_sessions,
          teacher.first_name || ' ' || teacher.last_name as requester_name,
          learner.first_name || ' ' || learner.last_name as instructor_name,
          teacher.profile_picture_url as requester_picture,
          learner.profile_picture_url as instructor_picture,
          ec.created_at
         FROM exchange_cycles ec
         JOIN cycle_participants cp_teacher ON cp_teacher.cycle_id = ec.id
         JOIN users teacher ON teacher.id = cp_teacher.user_id
         JOIN cycle_participants cp_learner ON cp_learner.cycle_id = ec.id
           AND cp_learner.skill_receiving = cp_teacher.skill_offering
           AND cp_learner.user_id <> cp_teacher.user_id
         JOIN users learner ON learner.id = cp_learner.user_id
         LEFT JOIN sync_exchange_sessions ses ON ses.cycle_id = ec.id
         WHERE ec.exchange_mode = 'sync'
           AND ec.status IN ('active', 'proposed', 'pending')
         GROUP BY ec.id, ec.pair_session_counts, ec.session_count, ec.created_at,
                  cp_teacher.position_in_cycle, cp_teacher.skill_offering,
                  teacher.first_name, teacher.last_name, teacher.profile_picture_url,
                  learner.first_name, learner.last_name, learner.profile_picture_url
         ORDER BY ec.created_at DESC
         LIMIT 40`
      );
      syncRows = syncResult.rows;
    }

    const terminatedResult = await pool.query(
      `SELECT 
        er.id as exchange_id,
        s.title as skill_title,
        'async' as session_type,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as total_credits,
        COALESCE(er.session_count, 
          CASE 
            WHEN COALESCE(s.credits_required, 
              CASE 
                WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
                ELSE 2
              END
            ) = 3 THEN 20
            ELSE 15
          END
        ) as total_sessions,
        COUNT(es.id) FILTER (WHERE es.status = 'completed') as completed_sessions,
        COALESCE(SUM(es.credit_share) FILTER (WHERE es.status = 'completed'), 0) as credits_released,
        COALESCE(er.escrow_credits, 0) as credits_in_escrow,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture,
        er.updated_at as terminated_at
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       LEFT JOIN exchange_sessions es ON er.id = es.exchange_request_id
       WHERE er.status = 'terminated'
       GROUP BY er.id, s.title, s.credits_required, sc.name, er.session_count,
                requester.first_name, requester.last_name, requester.profile_picture_url,
                instructor.first_name, instructor.last_name, instructor.profile_picture_url,
                er.updated_at
       ORDER BY er.updated_at DESC
       LIMIT 20`
    );

    const completedResult = await pool.query(
      `SELECT 
        er.id as exchange_id,
        s.title as skill_title,
        'async' as session_type,
        COALESCE(s.credits_required, 
          CASE 
            WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
            ELSE 2
          END
        ) as total_credits,
        COALESCE(er.session_count, 
          CASE 
            WHEN COALESCE(s.credits_required, 
              CASE 
                WHEN sc.name IN ('Programming', 'Mathematics', 'Science', 'Engineering') THEN 3
                ELSE 2
              END
            ) = 3 THEN 20
            ELSE 15
          END
        ) as total_sessions,
        COUNT(es.id) FILTER (WHERE es.status = 'completed') as completed_sessions,
        COALESCE(SUM(es.credit_share) FILTER (WHERE es.status = 'completed'), 0) as credits_released,
        COALESCE(er.escrow_credits, 0) as credits_in_escrow,
        requester.first_name || ' ' || requester.last_name as requester_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name,
        requester.profile_picture_url as requester_picture,
        instructor.profile_picture_url as instructor_picture,
        er.updated_at as completed_at
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       LEFT JOIN skill_categories sc ON s.category_id = sc.id
       JOIN users requester ON er.requester_id = requester.id
       JOIN users instructor ON er.instructor_id = instructor.id
       LEFT JOIN exchange_sessions es ON er.id = es.exchange_request_id
       WHERE er.status = 'completed'
       GROUP BY er.id, s.title, s.credits_required, sc.name, er.session_count,
                requester.first_name, requester.last_name, requester.profile_picture_url,
                instructor.first_name, instructor.last_name, instructor.profile_picture_url,
                er.updated_at
       ORDER BY er.updated_at DESC
       LIMIT 30`
    );

    const combined = [...asyncResult.rows, ...syncRows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30);

    res.json({ active: combined, completed: completedResult.rows, terminated: terminatedResult.rows });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    console.error('Error details:', error.message);
    // Return empty shape instead of error to prevent UI breaking
    res.json({ active: [], completed: [], terminated: [] });
  }
});

// ─── Admin Job Trigger Endpoints ─────────────────────────────────────────────

// Manually trigger async match generation for all users
router.post('/jobs/run-matches', authenticateAdmin, async (req, res) => {
  res.json({ message: 'Async match generation started in background' });
  generateAsyncMatchesForAllUsers().catch(err =>
    console.error('[ADMIN JOB] Async match error:', err.message)
  );
});

// Manually trigger cycle detection for all users
router.post('/jobs/run-cycles', authenticateAdmin, async (req, res) => {
  res.json({ message: 'Cycle detection started in background' });
  detectCyclesForAllUsers().catch(err =>
    console.error('[ADMIN JOB] Cycle detection error:', err.message)
  );
});

// Manually trigger both jobs
router.post('/jobs/run-all', authenticateAdmin, async (req, res) => {
  res.json({ message: 'All matching jobs started in background' });
  runAllMatchingJobs().catch(err =>
    console.error('[ADMIN JOB] Run all error:', err.message)
  );
});

// GET /admin/session-monitor - Session monitoring data for admin audit
router.get('/session-monitor', authenticateAdmin, async (req, res) => {
  try {
    const { status, flagged, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Regular one-on-one sessions
    let regularWhere = 'WHERE 1=1';
    const regularParams = [];

    if (status) {
      regularParams.push(status);
      regularWhere += ` AND es.status = $${regularParams.length}`;
    }
    if (flagged === 'true') {
      regularWhere += ` AND es.actual_duration_minutes IS NOT NULL AND es.duration_minutes IS NOT NULL AND es.actual_duration_minutes < (es.duration_minutes * 0.5)`;
    }

    const regularResult = await pool.query(
      `SELECT
         'regular' AS exchange_type,
         es.id::TEXT AS session_id,
         es.session_index,
         es.status,
         es.scheduled_at,
         es.duration_minutes AS planned_duration,
         es.actual_duration_minutes,
         es.mentor_joined_at,
         es.learner_joined_at,
         es.actual_started_at,
         es.actual_ended_at,
         es.meeting_link,
         er.id::TEXT AS exchange_id,
         s.title AS skill_title,
         mentor.first_name || ' ' || mentor.last_name AS mentor_name,
         mentor.email AS mentor_email,
         learner.first_name || ' ' || learner.last_name AS learner_name,
         learner.email AS learner_email,
         CASE
           WHEN es.actual_duration_minutes IS NOT NULL
                AND es.duration_minutes IS NOT NULL
                AND es.actual_duration_minutes < (es.duration_minutes * 0.5)
           THEN true ELSE false
         END AS flagged
       FROM exchange_sessions es
       JOIN exchange_requests er ON er.id = es.exchange_request_id
       JOIN skills s ON s.id = er.skill_id
       JOIN users mentor ON mentor.id = er.instructor_id
       JOIN users learner ON learner.id = er.requester_id
       ${regularWhere}
       ORDER BY es.scheduled_at DESC NULLS LAST
       LIMIT $${regularParams.length + 1} OFFSET $${regularParams.length + 2}`,
      [...regularParams, parseInt(limit), offset]
    );

    // Sync multi-party sessions
    let syncWhere = 'WHERE 1=1';
    const syncParams = [];

    if (status) {
      syncParams.push(status);
      syncWhere += ` AND ses.status = $${syncParams.length}`;
    }
    if (flagged === 'true') {
      syncWhere += ` AND ses.actual_duration_minutes IS NOT NULL AND ses.duration_minutes IS NOT NULL AND ses.actual_duration_minutes < (ses.duration_minutes * 0.5)`;
    }

    const syncResult = await pool.query(
      `SELECT
         'sync' AS exchange_type,
         ses.id::TEXT AS session_id,
         ses.session_index,
         ses.status,
         ses.scheduled_at,
         ses.duration_minutes AS planned_duration,
         ses.actual_duration_minutes,
         NULL::TIMESTAMPTZ AS mentor_joined_at,
         NULL::TIMESTAMPTZ AS learner_joined_at,
         ses.actual_started_at,
         ses.actual_ended_at,
         ses.meeting_link,
         ses.cycle_id::TEXT AS exchange_id,
         ses.session_notes,
         ses.skill_pair_index,
         ses.join_timestamps,
         ses.confirmations,
         ec.cycle_length,
         ec.total_participants,
         CASE
           WHEN ses.actual_duration_minutes IS NOT NULL
                AND ses.duration_minutes IS NOT NULL
                AND ses.actual_duration_minutes < (ses.duration_minutes * 0.5)
           THEN true ELSE false
         END AS flagged
       FROM sync_exchange_sessions ses
       JOIN exchange_cycles ec ON ec.id = ses.cycle_id
       ${syncWhere}
       ORDER BY ses.scheduled_at DESC NULLS LAST
       LIMIT $${syncParams.length + 1} OFFSET $${syncParams.length + 2}`,
      [...syncParams, parseInt(limit), offset]
    );

    // Enrich sync session join_timestamps with participant names
    const syncRows = syncResult.rows;
    if (syncRows.length > 0) {
      const cycleIds = [...new Set(syncRows.map(r => r.exchange_id))];
      const participantsRes = await pool.query(
        `SELECT cp.cycle_id::TEXT, cp.user_id::TEXT, cp.position_in_cycle,
                cp.skill_offering,
                u.first_name || ' ' || u.last_name AS full_name
         FROM cycle_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.cycle_id = ANY($1::uuid[])`,
        [cycleIds]
      );
      const nameMap = {};
      const skillMap = {};
      for (const row of participantsRes.rows) {
        if (!nameMap[row.cycle_id]) nameMap[row.cycle_id] = {};
        nameMap[row.cycle_id][row.user_id] = row.full_name;
        if (!skillMap[row.cycle_id]) skillMap[row.cycle_id] = {};
        skillMap[row.cycle_id][row.position_in_cycle] = row.skill_offering;
      }
      for (const row of syncRows) {
        const cycleNames = nameMap[row.exchange_id] || {};
        const jt = row.join_timestamps || {};
        const named = {};
        for (const [uid, ts] of Object.entries(jt)) {
          named[cycleNames[uid] || uid.slice(0, 8) + '…'] = ts;
        }
        row.join_timestamps_named = named;
        const conf = row.confirmations || {};
        const confNamed = {};
        for (const [uid, data] of Object.entries(conf)) {
          confNamed[cycleNames[uid] || uid.slice(0, 8) + '…'] = data;
        }
        row.confirmations_named = confNamed;
        const pairIdx = row.skill_pair_index;
        row.skill_title = pairIdx !== null && pairIdx !== undefined
          ? (skillMap[row.exchange_id]?.[pairIdx] || null)
          : null;
      }
    }

    res.json({
      regular: regularResult.rows,
      sync: syncRows,
      total: regularResult.rows.length + syncRows.length
    });
  } catch (error) {
    console.error('Error fetching session monitor data:', error);
    res.status(500).json({ message: 'Failed to fetch session monitoring data' });
  }
});

/**
 * POST /api/admin/sessions/:exchangeId/resolve-escrow
 * Transfer remaining escrow credits to either the learner (refund) or
 * the instructor (release) as part of a report resolution.
 * Body: { recipient: 'learner' | 'instructor', reason?: string }
 */
router.post('/sessions/:exchangeId/resolve-escrow', authenticateAdmin, async (req, res) => {
  const { exchangeId } = req.params;
  const { recipient, reason } = req.body || {};

  if (!['learner', 'instructor'].includes(recipient)) {
    return res.status(400).json({ message: "recipient must be 'learner' or 'instructor'" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exchangeResult = await client.query(
      `SELECT er.*, s.title AS skill_title
         FROM exchange_requests er
         LEFT JOIN skills s ON s.id = er.skill_id
        WHERE er.id = $1
        FOR UPDATE OF er`,
      [exchangeId]
    );

    if (exchangeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Exchange not found' });
    }

    const exchange = exchangeResult.rows[0];
    const escrowAmount = parseFloat(exchange.escrow_credits);

    if (!escrowAmount || escrowAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No credits currently held in escrow for this exchange' });
    }

    const recipientUserId = recipient === 'learner'
      ? exchange.requester_id
      : exchange.instructor_id;

    // Credit the recipient's wallet
    await client.query(
      'UPDATE users SET time_credits = time_credits + $1 WHERE id = $2',
      [escrowAmount, recipientUserId]
    );

    // Clear escrow and close the exchange. Use 'terminated' (admin-driven
    // closure) rather than 'completed' so the exchange isn't mistaken for a
    // natural completion and can be distinguished in audit / banners.
    await client.query(
      `UPDATE exchange_requests
          SET escrow_credits = 0,
              status = 'terminated',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [exchangeId]
    );

    // Look up admin username for the ledger description
    const adminLookup = await client.query(
      'SELECT username FROM admins WHERE id = $1',
      [req.admin.id]
    );
    const adminUsername = adminLookup.rows[0]?.username || 'Admin';

    const transactionType = recipient === 'learner' ? 'admin_refund' : 'admin_release';
    const trimmedReason = (reason || '').toString().trim().slice(0, 200);
    const description = `Admin ${adminUsername} transferred ${escrowAmount.toFixed(3)} escrow credits to ${recipient} for "${exchange.skill_title || 'exchange'}"` +
      (trimmedReason ? ` — Reason: ${trimmedReason}` : '');

    // Record the ledger entry. from_user_id is NULL because the credits come
    // from the exchange's escrow "account" (platform-held), NOT from the
    // counterparty's personal wallet. This prevents the counterparty from
    // seeing an inflated "Total Spent" for credits they never held.
    await client.query(
      `INSERT INTO transactions
         (exchange_request_id, from_user_id, to_user_id, credits, transaction_type, description)
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [exchangeId, recipientUserId, escrowAmount, transactionType, description]
    );

    // Post a system message to both participants so the workspace chat
    // reflects the admin action alongside the red "Exchange terminated" banner.
    const NEXUS_ADMIN_ID = '00000000-0000-0000-0000-000000000000';
    const recipientLabel = recipient === 'learner' ? 'the learner (refund)' : 'the instructor (release)';
    const systemMessage =
      `⚠️ This exchange has been closed by NEXUS administration (admin: ${adminUsername}). ` +
      `${escrowAmount.toFixed(2)} escrow credits were transferred to ${recipientLabel}.` +
      (trimmedReason ? ` Reason: ${trimmedReason}.` : '');

    await client.query(
      `INSERT INTO messages (exchange_request_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4), ($1, $2, $5, $4)`,
      [exchangeId, NEXUS_ADMIN_ID, exchange.requester_id, systemMessage, exchange.instructor_id]
    );

    await client.query('COMMIT');

    return res.json({
      message: `Escrow transferred to ${recipient}`,
      exchangeId,
      recipient,
      credits: escrowAmount,
      transactionType
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resolving escrow:', error);
    return res.status(500).json({ message: 'Failed to resolve escrow', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/sessions/:exchangeId/terminate
 * Administratively terminate an active exchange. Does NOT touch escrow —
 * the admin should resolve escrow (refund/release) separately if credits
 * remain. Sets status to 'terminated' so both parties see a clear banner
 * in their workspace.
 */
router.post('/sessions/:exchangeId/terminate', authenticateAdmin, async (req, res) => {
  const { exchangeId } = req.params;
  const { reason } = req.body || {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT er.id, er.status, er.escrow_credits, s.title AS skill_title
         FROM exchange_requests er
         LEFT JOIN skills s ON s.id = er.skill_id
        WHERE er.id = $1
        FOR UPDATE OF er`,
      [exchangeId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Exchange not found' });
    }

    const current = existing.rows[0];

    if (['terminated', 'completed', 'declined', 'cancelled'].includes(current.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Exchange already ${current.status}` });
    }

    await client.query(
      `UPDATE exchange_requests
          SET status = 'terminated',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [exchangeId]
    );

    const adminLookup = await client.query(
      'SELECT username FROM admins WHERE id = $1',
      [req.admin.id]
    );
    const adminUsername = adminLookup.rows[0]?.username || 'Admin';
    const trimmedReason = (reason || '').toString().trim().slice(0, 200);

    // Post a system message visible in both parties' workspace thread
    const systemMessage =
      `⚠️ This exchange has been terminated by NEXUS administration (admin: ${adminUsername}).` +
      (trimmedReason ? ` Reason: ${trimmedReason}.` : '') +
      (Number(current.escrow_credits) > 0
        ? ` Remaining escrow of ${Number(current.escrow_credits).toFixed(2)} credits will be resolved by an administrator.`
        : '');

    // Notify both participants via the messages table
    const participants = await client.query(
      'SELECT requester_id, instructor_id FROM exchange_requests WHERE id = $1',
      [exchangeId]
    );
    const { requester_id, instructor_id } = participants.rows[0];

    // NEXUS Admin system user id (seeded via add_nexus_admin_user migration)
    const NEXUS_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

    await client.query(
      `INSERT INTO messages (exchange_request_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4), ($1, $2, $5, $4)`,
      [exchangeId, NEXUS_ADMIN_ID, requester_id, systemMessage, instructor_id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Exchange terminated',
      exchangeId,
      status: 'terminated',
      escrowRemaining: Number(current.escrow_credits) || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error terminating exchange:', error);
    return res.status(500).json({ message: 'Failed to terminate exchange', error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
