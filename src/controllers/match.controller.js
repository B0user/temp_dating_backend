const matchService = require('../services/match.service');
const User = require('../models/user.model');

exports.getPotentialMatches = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    // Get user's filters from their preferences
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Use filters if they exist, otherwise use preferences
    const filters = user.filters || {
      gender: user.preferences?.gender || user.wantToFind,
      ageRange: user.preferences?.ageRange || { min: 18, max: 100 },
      distance: user.preferences?.distance || 50,
      interests: user.interests || []
    };

    console.log('Potential matches request for userId:', userId, 'with filters:', filters);
    const result = await matchService.getPotentialMatches(
      userId,
      filters,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error in getPotentialMatches:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getUserMatches = async (req, res) => {
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
};

exports.likeUser = async (req, res) => {
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
};
