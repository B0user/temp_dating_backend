const matchService = require('../services/match.service');
const User = require('../models/user.model');
const LimitsService = require('../services/limits.service');

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

    // Check if user can use advanced filters
    const canUseFilters = await LimitsService.canUseFilters(userId);
    
    // Use filters if they exist and user is premium, otherwise use basic preferences
    const filters = user.filters || {
      gender: user.preferences?.gender || user.wantToFind,
      ageRange: user.preferences?.ageRange || { min: 18, max: 100 },
      distance: user.preferences?.distance || 50,
      interests: user.interests || []
    };

    // Remove location and status filters for free users
    if (!canUseFilters) {
      delete filters.location;
      delete filters.status;
    }

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
    const userId = req.user._id;
    const targetUserId = req.params.targetUserId;

    // Check if user has reached their daily like limit
    await LimitsService.checkAndUpdateLimits(userId, 'like');

    const match = await matchService.likeUser(userId, targetUserId, like);

    // If it's a mutual like, check and update mutual likes limit
    if (match && match.status === 'matched') {
      await LimitsService.checkAndUpdateLimits(userId, 'mutualLike');
    }

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

exports.superLikeUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.targetUserId;

    // Check if user has reached their daily super like limit
    await LimitsService.checkAndUpdateLimits(userId, 'superLike');

    const match = await matchService.superLikeUser(userId, targetUserId);

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

exports.returnProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.targetUserId;

    // Check if user has reached their daily return limit
    await LimitsService.checkAndUpdateLimits(userId, 'return');

    // const result = await matchService.returnProfile(userId, targetUserId);

    res.status(200).json({
      status: 'success',
      // data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
