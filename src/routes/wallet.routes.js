const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');

// Create payment intent
router.post('/payment-intent', walletController.createPaymentIntent);
router.post('/ton', walletController.saveTonWallet);

// Purchase coins
router.post('/purchase', walletController.purchaseCoins);

// Get user's transactions
router.get('/transactions', walletController.getUserTransactions);

// Create subscription
router.post('/subscription', walletController.createSubscription);

// Get user's subscription
router.get('/subscription', walletController.getUserSubscription);

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), walletController.handleWebhook);

module.exports = router; 