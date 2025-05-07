const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/admin.middleware');
const userController = require('../controllers/user.controller');

// Register route with file uploads
router.post('/register', userController.register);
// Login route
router.post('/login', userController.login);


// Get user profile
router.get('/get-user-id/:telegram_id', userController.getUserIdByTelegramId);

router.get('/profile', userController.getProfile);

// Get user by ID (admin only)
router.get('/:userId', userController.getUserById);
// Get all users (admin only)
router.get('/', isAdmin, userController.getAllUsers);


// Update user profile
router.put('/profile', userController.updateProfile);
// Update main user info
router.put('/mainInfoUpdate', userController.updateMainInfo);
// Update audio message
router.put('/updateAudio', userController.updateAudio);
// Update photos
router.put('/updatePhotos', userController.updatePhotos);
// Update interests
router.put('/updateInterests', userController.updateInterests);
// Update meet goal
router.put('/updateMeetGoal', userController.updateMeetGoal);
// Update filters
router.put('/updateFilters', userController.updateFilters);


// Delete photo
router.delete('/photo', userController.deletePhoto);
// Delete user (admin only)
router.delete('/:userId', userController.deleteUser);

module.exports = router; 