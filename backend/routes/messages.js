const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');


// Send a direct message (without exchange)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    // Insert message
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [senderId, receiverId, content]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// OLD ENDPOINT REMOVED - Now using exchange-based conversations endpoint below (line 224)

// Get direct messages with a specific user
router.get('/direct/:partnerId', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;

    const messagesResult = await query(
      `SELECT 
         m.*,
         u.first_name || ' ' || u.last_name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [userId, partnerId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// Get messages for an exchange request
router.get('/exchange/:exchangeId', async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { userId } = req.query;
    
    // Verify user is part of this exchange
    const exchangeResult = await query(
      'SELECT * FROM exchange_requests WHERE id = $1 AND (requester_id = $2 OR instructor_id = $2)',
      [exchangeId, userId]
    );
    
    if (exchangeResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }
    
    // Get messages for this exchange
    const messagesResult = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.exchange_request_id = $1
       ORDER BY m.created_at ASC`,
      [exchangeId]
    );
    
    // Mark messages as read for the current user
    await query(
      'UPDATE messages SET is_read = true WHERE exchange_request_id = $1 AND receiver_id = $2',
      [exchangeId, userId]
    );
    
    res.json(messagesResult.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, content } = req.body;
    const senderId = req.user.id;
    
    console.log('Sending message:', { exchangeId, content, senderId });
    
    // Verify user is part of this exchange and get receiver
    const exchangeResult = await query(
      'SELECT * FROM exchange_requests WHERE id = $1 AND (requester_id = $2 OR instructor_id = $2)',
      [exchangeId, senderId]
    );
    
    if (exchangeResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }
    
    const exchange = exchangeResult.rows[0];
    const receiverId = exchange.requester_id === senderId ? exchange.instructor_id : exchange.requester_id;
    
    console.log('Message details:', { exchangeId, senderId, receiverId, content });
    
    // Insert message
    const result = await query(
      `INSERT INTO messages (exchange_request_id, sender_id, receiver_id, content, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [exchangeId, senderId, receiverId, content]
    );
    
    // Get message with sender name
    const messageWithSender = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: messageWithSender.rows[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get user's conversations
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get conversations from exchange requests
    const result = await query(
      `SELECT 
         er.id as exchange_id,
         s.title as skill_title,
         CASE 
           WHEN er.requester_id = $1 THEN er.instructor_id
           ELSE er.requester_id
         END as partner_id,
         CASE 
           WHEN er.requester_id = $1 THEN u2.first_name || ' ' || u2.last_name
           ELSE u1.first_name || ' ' || u1.last_name
         END as partner_name,
         er.status,
         er.created_at,
         er.updated_at,
         (SELECT COUNT(*) FROM messages WHERE exchange_request_id = er.id AND receiver_id = $1 AND is_read = false) as unread_count
       FROM exchange_requests er
       JOIN skills s ON er.skill_id = s.id
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.instructor_id = u2.id
       WHERE (er.requester_id = $1 OR er.instructor_id = $1) 
         AND er.status IN ('accepted', 'completed')
       ORDER BY er.updated_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get user's conversations (from accepted exchange requests) - NEW ENDPOINT
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const NEXUS_ADMIN_ID = '00000000-0000-0000-0000-000000000000';
    
    // Get conversations from accepted exchange requests
    const exchangeConversations = await query(
      `SELECT DISTINCT ON (er.id)
         er.id as exchange_id,
         s.title as skill_title,
         CASE 
           WHEN er.requester_id = $1 THEN er.instructor_id
           ELSE er.requester_id
         END as partner_id,
         CASE 
           WHEN er.requester_id = $1 THEN u2.first_name || ' ' || u2.last_name
           ELSE u1.first_name || ' ' || u1.last_name
         END as partner_name,
         CASE 
           WHEN er.requester_id = $1 THEN u2.email
           ELSE u1.email
         END as partner_email,
         CASE 
           WHEN er.requester_id = $1 THEN u2.profile_picture_url
           ELSE u1.profile_picture_url
         END as partner_profile_picture,
         er.created_at,
         er.message as initial_message
       FROM exchange_requests er
       LEFT JOIN skills s ON er.skill_id = s.id
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.instructor_id = u2.id
       WHERE (er.requester_id = $1 OR er.instructor_id = $1) 
         AND er.status IN ('accepted', 'completed')
       ORDER BY er.id, er.created_at DESC`,
      [userId]
    );

    // Get direct messages from NEXUS Admin
    const adminMessages = await query(
      `SELECT DISTINCT
         NULL as exchange_id,
         'Admin Message' as skill_title,
         $2::uuid as partner_id,
         'NEXUS Admin' as partner_name,
         'admin@nexus.system' as partner_email,
         NULL as partner_profile_picture,
         MIN(m.created_at) as created_at,
         'Message from NEXUS Admin' as initial_message
       FROM messages m
       WHERE (m.sender_id = $2::uuid AND m.receiver_id = $1)
          OR (m.sender_id = $1 AND m.receiver_id = $2::uuid)
       GROUP BY m.sender_id, m.receiver_id
       HAVING COUNT(*) > 0`,
      [userId, NEXUS_ADMIN_ID]
    );

    // Combine both results
    const allConversations = [...exchangeConversations.rows, ...adminMessages.rows];

    res.json(allConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation - NEW ENDPOINT
router.get('/conversation/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this exchange
    const exchangeResult = await query(
      'SELECT * FROM exchange_requests WHERE id = $1 AND (requester_id = $2 OR instructor_id = $2)',
      [exchangeId, userId]
    );

    if (exchangeResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Get messages for this exchange
    const messagesResult = await query(
      `SELECT 
         m.*,
         u.first_name || ' ' || u.last_name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.exchange_request_id = $1
       ORDER BY m.created_at ASC`,
      [exchangeId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Delete a message - NEW ENDPOINT
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Verify user owns this message
    const messageResult = await query(
      'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
      [messageId, userId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied - you can only delete your own messages' });
    }

    // Delete the message
    await query(
      'DELETE FROM messages WHERE id = $1',
      [messageId]
    );

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Delete direct message conversation with a specific partner
router.delete('/direct/:partnerId', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;

    console.log('Deleting direct conversation:', { partnerId, userId });

    // Delete all direct messages between these two users
    const deleteResult = await query(
      `DELETE FROM messages 
       WHERE exchange_request_id IS NULL 
       AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
      [userId, partnerId]
    );

    console.log('Deleted direct messages count:', deleteResult.rowCount);

    res.json({
      message: 'Direct conversation deleted successfully',
      deletedMessages: deleteResult.rowCount
    });
  } catch (error) {
    console.error('Error deleting direct conversation:', error);
    res.status(500).json({ message: 'Failed to delete conversation', error: error.message });
  }
});

// Delete entire conversation - NEW ENDPOINT
router.delete('/conversation/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this exchange
    const exchangeResult = await query(
      'SELECT * FROM exchange_requests WHERE id = $1 AND (requester_id = $2 OR instructor_id = $2)',
      [exchangeId, userId]
    );

    if (exchangeResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Delete all messages for this exchange
    const deleteResult = await query(
      'DELETE FROM messages WHERE exchange_request_id = $1',
      [exchangeId]
    );

    // Mark the exchange as cancelled
    await query(
      'UPDATE exchange_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', exchangeId]
    );

    res.json({
      message: 'Conversation deleted successfully',
      deletedMessages: deleteResult.rowCount
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
});

// ─── Sync Group Chat Endpoints ───────────────────────────────────────────────

// GET /api/messages/group/:cycleId - Get messages for a sync group chat
router.get('/group/:cycleId', authenticateToken, async (req, res) => {
  try {
    const { cycleId } = req.params;
    const userId = req.user.id;

    // Verify user is a participant
    const access = await query(
      `SELECT 1 FROM cycle_participants WHERE cycle_id = $1 AND user_id = $2`,
      [cycleId, userId]
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this group chat' });
    }

    const result = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name,
              u.profile_picture_url AS sender_picture
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.cycle_id = $1
       ORDER BY m.created_at ASC`,
      [cycleId]
    );

    // Mark as read
    await query(
      `UPDATE messages SET is_read = true WHERE cycle_id = $1 AND receiver_id = $2`,
      [cycleId, userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /messages/group/:cycleId error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/group/:cycleId - Send a message to a sync group chat
router.post('/group/:cycleId', authenticateToken, async (req, res) => {
  try {
    const { cycleId } = req.params;
    const senderId = req.user.id;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Verify user is a participant
    const access = await query(
      `SELECT 1 FROM cycle_participants WHERE cycle_id = $1 AND user_id = $2`,
      [cycleId, senderId]
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this group chat' });
    }

    // Insert one message row per participant (receiver = each other participant)
    // But for group display we just store sender_id and cycle_id, receiver_id = sender for self
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, cycle_id, content, created_at)
       VALUES ($1, $1, $2, $3, NOW())
       RETURNING *`,
      [senderId, cycleId, content.trim()]
    );

    const withSender = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name,
              u.profile_picture_url AS sender_picture
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(withSender.rows[0]);
  } catch (err) {
    console.error('POST /messages/group/:cycleId error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/messages/group-conversations - List all sync group chats for user
router.get('/group-conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT ec.id AS cycle_id, ec.cycle_length, ec.cycle_data, ec.status AS cycle_status,
              ec.session_count, ec.current_session_index,
              cp.skill_offering AS teach_skill, cp.skill_receiving AS learn_skill,
              (SELECT content FROM messages WHERE cycle_id = ec.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages WHERE cycle_id = ec.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages WHERE cycle_id = ec.id AND is_read = false AND sender_id <> $1) AS unread_count,
              (SELECT json_agg(u.first_name || ' ' || u.last_name ORDER BY cp2.position_in_cycle)
               FROM cycle_participants cp2
               JOIN users u ON u.id = cp2.user_id
               WHERE cp2.cycle_id = ec.id) AS member_names,
              (SELECT json_agg(json_build_object('id', u.id::text, 'name', u.first_name || ' ' || u.last_name) ORDER BY cp2.position_in_cycle)
               FROM cycle_participants cp2
               JOIN users u ON u.id = cp2.user_id
               WHERE cp2.cycle_id = ec.id) AS member_details
       FROM exchange_cycles ec
       JOIN cycle_participants cp ON cp.cycle_id = ec.id AND cp.user_id = $1
       WHERE ec.exchange_mode = 'sync'
         AND ec.status IN ('active', 'completed')
       ORDER BY last_message_at DESC NULLS LAST`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /messages/group-conversations error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
