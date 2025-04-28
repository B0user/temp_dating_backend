const User = require('../models/user.model');
const { uploadToS3, generatePresignedUrl, deleteFromS3, generateMediaKey } = require('../utils/s3');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
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

// Helper function to clean up uploaded files
async function cleanupUploads(photos, audio) {
  try {
    // Clean up photos
    for (const photo of photos) {
      try {
        await deleteFromS3(photo.key);
      } catch (error) {
        logger.error('Error cleaning up photo:', error.message);
      }
    }

    // Clean up audio
    if (audio) {
      try {
        await deleteFromS3(audio.key);
      } catch (error) {
        logger.error('Error cleaning up audio:', error.message);
      }
    }
  } catch (error) {
    logger.error('Error during cleanup:', error.message);
  }
}

// User registration
async function registerUser(telegramId, name, gender, wantToFind, birthDay, country, city, latitude, longitude, purpose, interests, photos, audioMessage) {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ telegramId });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create new user
    const user = new User({
      telegramId,
      name,
      gender,
      wantToFind,
      birthDay: new Date(birthDay),
      country,
      city,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      purpose,
      interests: Array.isArray(interests) ? interests : interests.split(',').map(i => i.trim()),
      photos: photos.map(p => p.url),
      audioMessage: audioMessage?.url
    });

    await user.save();
    const token = generateToken(telegramId);

    return {
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        name: user.name,
        photos: user.photos,
        audioMessage: user.audioMessage
      }
    };
  } catch (error) {
    throw error;
  }
}

// User login
async function loginUser(telegramId) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      throw new Error('User not found');
    }

    const token = generateToken(telegramId);
    const photoUrls = await Promise.all(
      user.photos.map(async (photoKey) => {
        return await generatePresignedUrl(photoKey);
      })
    );

    let audioMessageUrl = null;
    if (user.audioMessage) {
      audioMessageUrl = await generatePresignedUrl(user.audioMessage);
    }

    return {
      token,
      user: {
        telegramId: user.telegramId,
        name: user.name,
        gender: user.gender,
        wantToFind: user.wantToFind,
        birthDay: user.birthDay,
        country: user.country,
        city: user.city,
        purpose: user.purpose,
        interests: user.interests,
        photos: photoUrls,
        audioMessage: audioMessageUrl
      }
    };
  } catch (error) {
    throw error;
  }
}

// Get user profile
async function getProfile(userId) {
  try {
    const user = await User.findById(userId)
      .select('-password -verification.photo -verification.reviewedBy -verification.reviewedAt');
    
    if (!user) {
      throw new Error('User not found');
    }

    const userObj = user.toObject();

    // Generate signed URLs for photos
    if (userObj.photos && userObj.photos.length > 0) {
      userObj.photos = await Promise.all(userObj.photos.map(async (photoUrl) => {
        try {
          const key = photoUrl.split('.com/')[1];
          if (!key) {
            logger.error('Invalid S3 URL format:', photoUrl);
            return photoUrl;
          }
          const signedUrl = await generatePresignedUrl(key, 3600);
          return signedUrl;
        } catch (error) {
          logger.error('Error generating signed URL:', error);
          return photoUrl;
        }
      }));
    }

    // Generate signed URL for audio message if exists
    if (userObj.audioMessage) {
      try {
        const key = userObj.audioMessage.split('.com/')[1];
        if (key) {
          userObj.audioMessage = await generatePresignedUrl(key, 3600);
        }
      } catch (error) {
        logger.error('Error generating signed URL for audio:', error);
      }
    }

    return userObj;
  } catch (error) {
    throw error;
  }
}

// Update user profile
async function updateProfile(userId, updateData) {
  try {
    const validatedData = updateProfileSchema.parse(updateData);
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: validatedData },
      { new: true, runValidators: true }
    ).select('-password -verification.photo -verification.reviewedBy -verification.reviewedAt');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error('Invalid profile data');
    }
    throw error;
  }
}

// Get user by ID
async function getUserById(userId) {
  try {
    const user = await User.findById(userId)
      .select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }

    const userObj = user.toObject();

    // Generate signed URLs for photos
    if (userObj.photos && userObj.photos.length > 0) {
      userObj.photos = await Promise.all(userObj.photos.map(async (photoUrl) => {
        try {
          const key = photoUrl.split('.com/')[1];
          if (!key) {
            logger.error('Invalid S3 URL format:', photoUrl);
            return photoUrl;
          }
          const signedUrl = await generatePresignedUrl(key, 3600);
          // console.log("signedUrl", signedUrl);
          return signedUrl;
        } catch (error) {
          logger.error('Error generating signed URL:', error);
          return photoUrl;
        }
      }));
    }

    // Generate signed URL for audio message if exists
    if (userObj.audioMessage) {
      try {
        const key = userObj.audioMessage.split('.com/')[1];
        if (key) {
          userObj.audioMessage = await generatePresignedUrl(key, 3600);
        }
      } catch (error) {
        logger.error('Error generating signed URL for audio:', error);
      }
    }
    return userObj;
  } catch (error) {
    throw error;
  }
}

// Get all users
async function getAllUsers(page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Generate signed URLs for all users' photos and audio messages
    const usersWithSignedUrls = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject();

      // Generate signed URLs for photos
      if (userObj.photos && userObj.photos.length > 0) {
        userObj.photos = await Promise.all(userObj.photos.map(async (photoUrl) => {
          try {
            const key = photoUrl.split('.com/')[1];
            if (!key) {
              logger.error('Invalid S3 URL format:', photoUrl);
              return photoUrl;
            }
            const signedUrl = await generatePresignedUrl(key, 3600);
            return signedUrl;
          } catch (error) {
            logger.error('Error generating signed URL:', error);
            return photoUrl;
          }
        }));
      }

      // Generate signed URL for audio message if exists
      if (userObj.audioMessage) {
        try {
          const key = userObj.audioMessage.split('.com/')[1];
          if (key) {
            userObj.audioMessage = await generatePresignedUrl(key, 3600);
          }
        } catch (error) {
          logger.error('Error generating signed URL for audio:', error);
        }
      }

      return userObj;
    }));

    const total = await User.countDocuments();

    return {
      users: usersWithSignedUrls,
      total,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw error;
  }
}

// Delete user
async function deleteUser(userId) {
  try {
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  getUserById,
  getAllUsers,
  deleteUser,
  cleanupUploads
}; 