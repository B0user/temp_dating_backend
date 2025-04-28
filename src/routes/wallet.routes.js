const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Create payment intent
router.post('/payment-intent', authMiddleware, walletController.createPaymentIntent);

// Purchase coins
router.post('/purchase', authMiddleware, walletController.purchaseCoins);

// Get user's transactions
router.get('/transactions', authMiddleware, walletController.getUserTransactions);

// Create subscription
router.post('/subscription', authMiddleware, walletController.createSubscription);

// Get user's subscription
router.get('/subscription', authMiddleware, walletController.getUserSubscription);

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), walletController.handleWebhook);

module.exports = router; 