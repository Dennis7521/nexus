const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/transactions
 * Get all credit transactions for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all transactions where user is either sender or receiver
    // Filter logic:
    // - LEARNER (sender): Show escrow and refund, hide session_payment
    // - INSTRUCTOR (receiver): Show session_payment only, hide escrow and refund
    const result = await query(
      `SELECT 
        t.id,
        t.credits,
        t.transaction_type,
        t.description,
        t.created_at,
        t.from_user_id,
        t.to_user_id,
        t.exchange_request_id,
        er.status as exchange_status,
        s.title as skill_title,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        receiver.first_name as receiver_first_name,
        receiver.last_name as receiver_last_name
      FROM transactions t
      LEFT JOIN exchange_requests er ON t.exchange_request_id = er.id
      LEFT JOIN skills s ON er.skill_id = s.id
      LEFT JOIN users sender ON t.from_user_id = sender.id
      LEFT JOIN users receiver ON t.to_user_id = receiver.id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $1)
      ORDER BY t.created_at DESC`,
      [userId]
    );

    // Transform transactions for frontend
    const transactions = result.rows.map(tx => {
      const isReceiver = tx.to_user_id === userId;
      const isCredit = isReceiver;
      
      const creditsNum = parseFloat(tx.credits);

      // Friendly label for counterparty when the other side is the platform
      // (from/to is NULL). Escrow / session_payment / refund / admin_* all
      // flow through a system "escrow" account rather than another user.
      const systemLabelFor = (type) => {
        if (type === 'escrow') {
          return tx.skill_title ? `Escrow · ${tx.skill_title}` : 'Escrow balance';
        }
        if (type === 'session_payment') {
          return tx.skill_title ? `Escrow · ${tx.skill_title}` : 'Escrow balance';
        }
        if (type === 'refund' || type === 'admin_refund' || type === 'admin_release') {
          return tx.skill_title ? `Escrow · ${tx.skill_title}` : 'Escrow balance';
        }
        if (type === 'welcome_bonus') return 'NEXUS';
        if (type === 'purchase') return 'Credit Store';
        if (type === 'system_adjustment') return 'System';
        return null;
      };

      const senderName = tx.sender_first_name
        ? `${tx.sender_first_name} ${tx.sender_last_name}`
        : systemLabelFor(tx.transaction_type);
      const receiverName = tx.receiver_first_name
        ? `${tx.receiver_first_name} ${tx.receiver_last_name}`
        : systemLabelFor(tx.transaction_type);

      return {
        id: tx.id.toString(),
        type: isCredit ? 'earned' : 'spent',
        description: tx.description || `${tx.transaction_type} transaction`,
        credits: isCredit ? creditsNum : -creditsNum,
        date: new Date(tx.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        fullDate: tx.created_at,
        status: tx.exchange_status || 'completed',
        transactionType: tx.transaction_type,
        partnerName: isReceiver ? senderName : receiverName,
        exchangeRequestId: tx.exchange_request_id
      };
    });

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

/**
 * GET /api/transactions/balance
 * Get current credit balance for the authenticated user
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current credit balance from users table
    const result = await query(
      'SELECT time_credits FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      balance: result.rows[0].time_credits || 0
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance',
      error: error.message
    });
  }
});

/**
 * POST /api/transactions/create
 * Create a new transaction (admin/system use)
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      toUserId,
      credits,
      transactionType,
      description,
      exchangeRequestId
    } = req.body;

    const fromUserId = req.user.id;

    // Validate required fields
    if (!credits || !transactionType) {
      return res.status(400).json({
        success: false,
        message: 'Credits and transaction type are required'
      });
    }

    // Insert transaction
    const result = await query(
      `INSERT INTO transactions 
        (from_user_id, to_user_id, credits, transaction_type, description, exchange_request_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [fromUserId, toUserId, credits, transactionType, description, exchangeRequestId]
    );

    res.status(201).json({
      success: true,
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
});

/**
 * GET /api/transactions/summary
 * Get transaction summary (total earned, spent, current balance)
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Credits Earned = every incoming row except purchases/welcome bonuses.
    // This bucket therefore includes session_payments, refunds, admin
    // refunds/releases and any positive system_adjustment so the summary
    // cards always reconcile with the wallet balance.
    const earnedResult = await query(
      `SELECT COALESCE(SUM(credits), 0) as total_earned
       FROM transactions
       WHERE to_user_id = $1
         AND transaction_type NOT IN ('purchase', 'welcome_bonus')`,
      [userId]
    );

    // Total Spent = every outgoing row. All of escrow, refund reversals,
    // negative system_adjustment rows flow through from_user_id = user.
    const spentResult = await query(
      `SELECT COALESCE(SUM(credits), 0) as total_spent
       FROM transactions
       WHERE from_user_id = $1`,
      [userId]
    );

    // Get total credits purchased (including welcome bonus)
    const purchasedResult = await query(
      `SELECT COALESCE(SUM(credits), 0) as total_purchased
       FROM transactions
       WHERE to_user_id = $1
         AND transaction_type IN ('purchase', 'welcome_bonus')`,
      [userId]
    );

    // Get current balance
    const balanceResult = await query(
      'SELECT time_credits FROM users WHERE id = $1',
      [userId]
    );

    res.json({
      success: true,
      summary: {
        totalEarned: parseFloat(earnedResult.rows[0].total_earned),
        totalSpent: parseFloat(spentResult.rows[0].total_spent),
        totalPurchased: parseFloat(purchasedResult.rows[0].total_purchased),
        currentBalance: balanceResult.rows[0]?.time_credits || 0
      }
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction summary',
      error: error.message
    });
  }
});

module.exports = router;
