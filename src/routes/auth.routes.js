const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Telegram login
router.post('/telegram', authController.telegramLogin);

// Register user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Validate token
router.post('/validate', authController.validateToken);

// Verify token
router.get('/verify', authController.verifyToken);

// Logout
router.post('/logout', authController.logout);

module.exports = router; 