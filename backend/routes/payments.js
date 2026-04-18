const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const CreditPurchase = require('../models/CreditPurchase');
const emailService = require('../services/emailService');
require('dotenv').config();

const CREDIT_PACKAGES = [
  { credits: 5,  priceInThebe: 10000 },
  { credits: 12, priceInThebe: 24000 },
  { credits: 20, priceInThebe: 40000 },
];

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe Checkout session for buying credits
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { credits } = req.body;
    const userId = req.user.id;

    const pkg = CREDIT_PACKAGES.find(p => p.credits === parseInt(credits));
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Invalid credit package selected' });
    }

    const userResult = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = userResult.rows[0];

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'bwp',
            product_data: {
              name: `NEXUS Credits — ${pkg.credits} Credits`,
              description: `Purchase ${pkg.credits} time-banking credits on NEXUS`,
            },
            unit_amount: pkg.priceInThebe,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(),
        credits: pkg.credits.toString(),
        amountBwp: (pkg.priceInThebe / 100).toFixed(2),
      },
      success_url: `${frontendUrl}/credit-store?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/credit-store?cancelled=true`,
    });

    await CreditPurchase.create({
      userId,
      creditsPurchased: pkg.credits,
      amountPaid: pkg.priceInThebe / 100,
      currency: 'BWP',
      stripeSessionId: session.id,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ success: false, message: 'Failed to create checkout session', error: error.message });
  }
});

/**
 * GET /api/payments/session/:sessionId
 * Verify session status and credit user on success (called from success redirect)
 * No auth required — session ID is unguessable; userId validated via Stripe metadata
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const purchase = await CreditPurchase.getBySessionId(sessionId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    if (purchase.status === 'completed') {
      return res.json({ success: true, alreadyProcessed: true, purchase });
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== 'paid') {
      return res.json({ success: false, message: 'Payment not completed', status: stripeSession.payment_status });
    }

    await processPurchase(purchase, stripeSession.payment_intent);

    const updatedPurchase = await CreditPurchase.getBySessionId(sessionId);
    res.json({ success: true, purchase: updatedPurchase });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook — must be raw body, registered before json middleware in server.js
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️  STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const purchase = await CreditPurchase.getBySessionId(session.id);
      if (purchase && purchase.status !== 'completed') {
        await processPurchase(purchase, session.payment_intent);
      }
    } catch (err) {
      console.error('❌ Error processing webhook payment:', err);
      return res.status(500).send('Processing error');
    }
  }

  res.json({ received: true });
});

/**
 * GET /api/payments/history
 * Get authenticated user's purchase history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const purchases = await CreditPurchase.getByUserId(req.user.id);
    res.json({ success: true, purchases });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase history' });
  }
});

/**
 * Internal helper — credits user and records transaction after confirmed payment
 */
async function processPurchase(purchase, paymentIntentId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE credit_purchases
       SET status = 'completed',
           stripe_payment_intent_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [purchase.id, paymentIntentId]
    );

    await client.query(
      `UPDATE users SET time_credits = time_credits + $2 WHERE id = $1`,
      [purchase.user_id, purchase.credits_purchased]
    );

    await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, credits, transaction_type, description)
       VALUES (NULL, $1, $2, 'purchase', $3)`,
      [
        purchase.user_id,
        purchase.credits_purchased,
        `Credit purchase — ${purchase.credits_purchased} credits (P${Number(purchase.amount_paid).toFixed(2)})`,
      ]
    );

    await client.query('COMMIT');
    console.log(`✅ Credited ${purchase.credits_purchased} credits to user ${purchase.user_id}`);

    const userResult = await client.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [purchase.user_id]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      emailService.sendPurchaseReceiptEmail(
        user.email,
        `${user.first_name} ${user.last_name}`,
        purchase.credits_purchased,
        Number(purchase.amount_paid),
        paymentIntentId || purchase.stripe_session_id
      ).catch(err => console.error('❌ Failed to send receipt email:', err));
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ processPurchase error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = router;
