const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Telegram login
router.post('/telegram', authController.telegramLogin);

// Register user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Validate token
router.post('/validate', authController.validateToken);

// Verify token
router.get('/verify', authMiddleware, authController.verifyToken);

// Logout
router.post('/logout', authMiddleware, authController.logout);

module.exports = router; 