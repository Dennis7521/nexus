const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Get unread notification counts for a user
 * Returns: { unreadMessages: number, unreadRequests: number }
 */
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count unread messages (both direct messages and exchange messages)
    const messagesResult = await query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );

    // Count pending exchange requests (incoming requests that need action)
    const requestsResult = await query(
      `SELECT COUNT(*) as count 
       FROM exchange_requests 
       WHERE instructor_id = $1 AND status = 'pending'`,
      [userId]
    );

    res.json({
      unreadMessages: parseInt(messagesResult.rows[0].count),
      unreadRequests: parseInt(requestsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notification counts',
      unreadMessages: 0,
      unreadRequests: 0
    });
  }
});

/**
 * Mark all messages as read for the current user
 */
router.post('/messages/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE messages 
       SET is_read = true 
       WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

/**
 * Mark messages in a specific conversation as read
 */
router.post('/messages/mark-read/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exchangeId } = req.params;

    await query(
      `UPDATE messages 
       SET is_read = true 
       WHERE exchange_request_id = $1 AND receiver_id = $2 AND is_read = false`,
      [exchangeId, userId]
    );

    res.json({ message: 'Conversation messages marked as read' });
  } catch (error) {
    console.error('Error marking conversation messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

/**
 * Mark direct messages with a specific partner as read
 */
router.post('/messages/mark-read/direct/:partnerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    await query(
      `UPDATE messages 
       SET is_read = true 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false AND exchange_request_id IS NULL`,
      [partnerId, userId]
    );

    res.json({ message: 'Direct messages marked as read' });
  } catch (error) {
    console.error('Error marking direct messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

/**
 * Mark all pending requests as viewed (doesn't change status, just marks as seen)
 * This can be used when user opens the Requests page
 */
router.post('/requests/mark-viewed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // You could add a 'viewed_at' column to exchange_requests table if needed
    // For now, this endpoint exists for future implementation
    
    res.json({ message: 'Requests marked as viewed' });
  } catch (error) {
    console.error('Error marking requests as viewed:', error);
    res.status(500).json({ message: 'Failed to mark requests as viewed' });
  }
});

module.exports = router;
