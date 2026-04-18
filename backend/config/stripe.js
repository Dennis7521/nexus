const Stripe = require('stripe');
require('dotenv').config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️  STRIPE_SECRET_KEY not found in environment variables');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
