const express = require('express');
const router = express.Router();
const walletService = require('../services/wallet.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Create payment intent
router.post('/payment-intent', authMiddleware, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    const result = await walletService.createPaymentIntent(
      req.user._id,
      amount,
      currency,
      description
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get user's transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await walletService.getUserTransactions(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create subscription
router.post('/subscription', authMiddleware, async (req, res) => {
  try {
    const { plan, paymentMethod } = req.body;
    const result = await walletService.createSubscription(
      req.user._id,
      plan,
      paymentMethod
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get user's subscription
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const subscription = await walletService.getUserSubscription(req.user._id);

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await walletService.handleSuccessfulPayment(paymentIntent.id);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      // Handle subscription updates
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router; 