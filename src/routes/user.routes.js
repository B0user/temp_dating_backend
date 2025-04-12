const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const User = require('../models/user.model');
const { z } = require('zod');

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

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
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
router.put('/profile', authenticate, async (req, res) => {
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
router.get('/:userId', authenticate, isAdmin, async (req, res) => {
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
router.get('/', authenticate, isAdmin, async (req, res) => {
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
router.delete('/:userId', authenticate, isAdmin, async (req, res) => {
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