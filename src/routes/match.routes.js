const express = require('express');
const router = express.Router();
const matchService = require('../services/match.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Get potential matches
router.get('/potential', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    console.log('Potential matches request for userId:', userId);
    const result = await matchService.getPotentialMatches(
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
});

// Get user's matches
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await matchService.getUserMatches(
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

// Like/dislike user
router.post('/:targetUserId', async (req, res) => {
  try {
    const { like } = req.body;
    const match = await matchService.likeUser(
      req.body.userId,
      req.params.targetUserId,
      like
    );

    res.status(200).json({
      status: 'success',
      data: {
        match
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 