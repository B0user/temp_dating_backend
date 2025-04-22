const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Telegram login
router.post('/telegram', async (req, res) => {
  try {
    const { user, token } = await authService.verifyTelegramAuth(req.body);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.message === 'User with this Telegram ID already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { telegramId } = req.body;
    const { user, token } = await authService.login(telegramId);
    res.json({ user, token });
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Validate token
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const user = await authService.validateUser(token);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Verify token
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
});

// Logout (client-side only, as JWT tokens are stateless)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Update user's lastActive timestamp
    // 3. Clear any active sessions

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
});

module.exports = router; 