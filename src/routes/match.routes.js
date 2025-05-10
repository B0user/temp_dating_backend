const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');

// Get potential matches
router.get('/potential', matchController.getPotentialMatches);

// Get user's matches
router.get('/', matchController.getUserMatches);

// Like/dislike user
router.post('/:targetUserId', matchController.likeUser);

// Super like user
router.post('/:targetUserId/super-like', matchController.superLikeUser);

// Return profile
router.post('/:targetUserId/return', matchController.returnProfile);

module.exports = router; 