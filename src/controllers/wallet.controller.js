const walletService = require('../services/wallet.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    const userId = req.headers['x-user-id'];
    const result = await walletService.createPaymentIntent(
      userId,
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
};

exports.purchaseCoins = async (req, res) => {
  try {
    const { amount, type } = req.body;
    const userId = req.headers['x-user-id'];
    
    const result = await walletService.purchaseCoins(
      userId,
      amount,
      type
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
};

exports.getUserTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.headers['x-user-id'];
    const result = await walletService.getUserTransactions(
      userId,
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
};

exports.createSubscription = async (req, res) => {
  try {
    const { plan, paymentMethod } = req.body;
    const userId = req.headers['x-user-id'];
    const result = await walletService.createSubscription(
      userId,
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
};

exports.getUserSubscription = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const subscription = await walletService.getUserSubscription(userId);

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
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const userId = req.headers['x-user-id'];
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
      await walletService.handleSuccessfulPayment(paymentIntent.id, userId);
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
};
