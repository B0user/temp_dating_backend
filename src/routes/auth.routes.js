const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Admin routes
router.post('/admin/login', authController.adminLogin);
router.post('/admin/logout', authController.adminLogout);
router.post('/admin/refresh', authController.adminRefresh);
router.post('/admin/create', authController.adminCreateUser);

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

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

module.exports = router; 