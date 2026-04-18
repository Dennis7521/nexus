const { query } = require('../config/database');

class CreditPurchase {
  static async create({ userId, creditsPurchased, amountPaid, currency = 'BWP', stripeSessionId }) {
    const result = await query(
      `INSERT INTO credit_purchases (user_id, credits_purchased, amount_paid, currency, stripe_session_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, creditsPurchased, amountPaid, currency, stripeSessionId]
    );
    return result.rows[0];
  }

  static async updateStatus(stripeSessionId, status, stripePaymentIntentId = null) {
    const result = await query(
      `UPDATE credit_purchases
       SET status = $2,
           stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_session_id = $1
       RETURNING *`,
      [stripeSessionId, status, stripePaymentIntentId]
    );
    return result.rows[0];
  }

  static async getBySessionId(stripeSessionId) {
    const result = await query(
      'SELECT * FROM credit_purchases WHERE stripe_session_id = $1',
      [stripeSessionId]
    );
    return result.rows[0];
  }

  static async getByUserId(userId) {
    const result = await query(
      `SELECT * FROM credit_purchases WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getByPaymentIntentId(paymentIntentId) {
    const result = await query(
      'SELECT * FROM credit_purchases WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );
    return result.rows[0];
  }
}

module.exports = CreditPurchase;
