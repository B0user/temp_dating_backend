const express = require('express');
const router = express.Router();
const moderationService = require('../services/moderation.service');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

// Get pending verifications (admin only)
router.get('/verifications/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await moderationService.getPendingVerifications(
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

// Handle verification (admin only)
router.post('/verifications/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const user = await moderationService.handleVerification(
      req.user._id,
      {
        userId: req.params.userId,
        action,
        reason
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get verification history (admin only)
router.get('/verifications/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await moderationService.getVerificationHistory(
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

// Get user's verification status
router.get('/verifications/status/:userId', authMiddleware, async (req, res) => {
  try {
    const result = await moderationService.getUserVerificationStatus(req.params.userId);

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

module.exports = router; 