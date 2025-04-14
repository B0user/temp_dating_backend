const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const User = require('../models/user.model');
const authService = require('../services/auth.service');
const { z } = require('zod');
const multer = require('multer');
const userController = require('../controllers/user.controller');

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string()).optional(),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2)
  }).optional(),
  preferences: z.object({
    ageRange: z.object({
      min: z.number().min(18).max(100),
      max: z.number().min(18).max(100)
    }).optional(),
    distance: z.number().min(1).max(100).optional(),
    gender: z.enum(['male', 'female', 'other']).optional()
  }).optional()
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and audio files
    if (file.fieldname.startsWith('photo')) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for photos!'));
      }
    } else if (file.fieldname === 'audioMessage') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed for voice messages!'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// Register route with file uploads
router.post('/register', upload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
  { name: 'photo4', maxCount: 1 },
  { name: 'audioMessage', maxCount: 1 }
]), userController.register);

// Login route
router.post('/login', userController.login);

// Update main user info
router.put('/mainInfoUpdate', userController.updateMainInfo);

// Delete photo
router.delete('/photo', userController.deletePhoto);

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -verification.photo -verification.reviewedBy -verification.reviewedAt');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: validatedData },
      { new: true, runValidators: true }
    ).select('-password -verification.photo -verification.reviewedBy -verification.reviewedAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (admin only)
router.get('/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    res.json({
      users,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 