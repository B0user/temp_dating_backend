const User = require('../models/user.model');
const { uploadToS3, generatePresignedUrl, deleteFromS3, generateMediaKey } = require('../utils/s3');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const { z } = require('zod');
const userService = require('../services/user.service');

exports.getUserIdByTelegramId = async (req, res) => {
  try {
    const { telegram_id } = req.params;
    console.log("telegramId", telegram_id);
    const user = await User.findOne({ telegramId: telegram_id });
    console.log("user", user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ userId: user._id });
  } catch (error) {
    console.error('Error getting user ID by telegram ID:', error);
    res.status(500).json({ message: 'Error getting user ID by telegram ID' });
  }
};

// Validation schemas
// const updateProfileSchema = z.object({
//   username: z.string().min(3).max(30).optional(),
//   bio: z.string().max(500).optional(),
//   interests: z.array(z.string()).optional(),
//   location: z.object({
//     type: z.literal('Point'),
//     coordinates: z.array(z.number()).length(2)
//   }).optional(),
//   preferences: z.object({
//     ageRange: z.object({
//       min: z.number().min(18).max(100),
//       max: z.number().min(18).max(100)
//     }).optional(),
//     distance: z.number().min(1).max(100).optional(),
//     gender: z.enum(['male', 'female', 'other']).optional()
//   }).optional()
// });

exports.register = async (req, res) => {
  let uploadedPhotos = [];
  let uploadedAudio = null;

  try {
    // logger.info('Registration request received');
    // logger.debug('Request body:', JSON.stringify(req.body, null, 2));

    // Check for empty request body 
    // if (!req.body || Object.keys(req.body).length === 0) {
    //   logger.error('Empty request body received');
    //   return res.status(400).json({
    //     error: 'Missing required fields',
    //     details: {
    //       requiredFields: [
    //         'telegramId', 'name', 'gender', 'wantToFind', 'birthDay',
    //         'country', 'city', 'latitude', 'longitude', 'purpose', 'interests'
    //       ]
    //     }
    //   });
    // }

    // Extract and validate fields
    const {
      telegramId, name, gender, wantToFind, birthDay,
      country, city, latitude, longitude, purpose, interests
    } = req.body;

    // Validate required fields
    // const missingFields = [];
    // if (!telegramId) missingFields.push('telegramId');
    // if (!name) missingFields.push('name');
    // if (!gender) missingFields.push('gender');
    // if (!wantToFind) missingFields.push('wantToFind');
    // if (!birthDay) missingFields.push('birthDay');
    // if (!country) missingFields.push('country');
    // if (!city) missingFields.push('city');
    // if (!latitude) missingFields.push('latitude');
    // if (!longitude) missingFields.push('longitude');
    // if (!purpose) missingFields.push('purpose');
    // if (!interests) missingFields.push('interests');

    // if (missingFields.length > 0) {
    //   logger.error('Missing required fields:', missingFields);
    //   return res.status(400).json({
    //     error: 'Missing required fields',
    //     details: { missingFields }
    //   });
    // }

    // Validate gender and wantToFind enums
    // const validGenders = ['male', 'female', 'other'];
    // const validWantToFind = ['male', 'female', 'all'];

    // if (!validGenders.includes(gender)) {
    //   return res.status(400).json({
    //     error: 'Invalid gender',
    //     details: { validOptions: validGenders }
    //   });
    // }

    // if (!validWantToFind.includes(wantToFind)) {
    //   return res.status(400).json({
    //     error: 'Invalid wantToFind',
    //     details: { validOptions: validWantToFind }
    //   });
    // }

    // Check if user already exists
    const existingUser = await User.findOne({ telegramId });
    if (existingUser) {
      logger.error('User already exists with telegramId:', telegramId);
      return res.status(409).json({
        error: 'User already exists',
        details: { telegramId }
      });
    }

    // Process photos
    if (req.files) {
      logger.info('Processing photos...');
      for (let i = 1; i <= 4; i++) {
        const photoFile = req.files[`photo${i}`];
        if (photoFile && photoFile[0]) {
          try {
            const key = generateMediaKey(telegramId, 'photos', photoFile[0].originalname);
            console.log("key", key);
            console.log("photoFile", photoFile);
            const url = await uploadToS3(photoFile[0], key);
            console.log("url", url);
            uploadedPhotos.push({ key, url });
          } catch (error) {
            logger.error(`Error uploading photo${i}:`, error.message);
            await userService.cleanupUploads(uploadedPhotos, uploadedAudio);
            return res.status(500).json({
              error: 'Failed to upload photos',
              details: { 
                message: error.message,
                photoIndex: i
              }
            });
          }
        }
      }
    }

    // Process audio message if provided
    if (req.files && req.files.audioMessage && req.files.audioMessage[0]) {
      try {
        const audioFile = req.files.audioMessage[0];
        const key = generateMediaKey(telegramId, 'audio', audioFile.originalname);
        const url = await uploadToS3(audioFile, key);
        uploadedAudio = { key, url };
      } catch (error) {
        logger.error('Error uploading audio message:', error.message);
        await userService.cleanupUploads(uploadedPhotos, uploadedAudio);
        return res.status(500).json({
          error: 'Failed to upload audio message',
          details: { 
            message: error.message
          }
        });
      }
    }

    // Parse interests
    let parsedInterests = [];
    try {
      parsedInterests = Array.isArray(interests) 
        ? interests 
        : typeof interests === 'string' 
          ? interests.split(',').map(i => i.trim()) 
          : [];
    } catch (error) {
      logger.error('Error parsing interests:', error.message);
      await userService.cleanupUploads(uploadedPhotos, uploadedAudio);
      return res.status(400).json({
        error: 'Invalid interests format',
        details: { 
          message: 'Interests should be an array or comma-separated string'
        }
      });
    }

    const result = await userService.registerUser(
      telegramId, name, gender, wantToFind, birthDay,
      country, city, latitude, longitude, purpose, interests,
      uploadedPhotos, uploadedAudio
    );

    res.status(201).json({
      message: 'User registered successfully',
      ...result
    });

  } catch (error) {
    logger.error('Registration error:', error.message);
    await userService.cleanupUploads(uploadedPhotos, uploadedAudio);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    // Handle other errors
    return res.status(500).json({
      error: 'Internal server error',
      details: { 
        message: error.message
      }
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { telegramId } = req.body;
    const result = await userService.loginUser(telegramId);
    res.status(200).json({
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const { telegramId, photoKey } = req.body;

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete photo from S3
    await deleteFromS3(photoKey);

    // Remove photo from user's photos array
    user.photos = user.photos.filter(photo => photo !== photoKey);
    await user.save();

    // Generate presigned URLs for remaining photos
    const photoUrls = await Promise.all(
      user.photos.map(async (key) => {
        return await generatePresignedUrl(key);
      })
    );

    res.status(200).json({
      message: 'Photo deleted successfully',
      photos: photoUrls
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ message: 'Error deleting photo' });
  }
};

exports.updateMainInfo = async (req, res) => {
  try {
    const { name, gender, wantToFind, birthDay, country, city, latitude, longitude } = req.body;
    const userId = req.headers['x-user-id'];
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update main user information
    user.name = name;
    user.gender = gender;
    user.wantToFind = wantToFind;
    user.birthDay = new Date(birthDay); // Parse the date string to Date object
    user.country = country;
    user.city = city;

    // Update location if coordinates are provided
    if (latitude && longitude) {
      user.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    // Update preferences if not set or update gender preference
    if (!user.preferences) {
      user.preferences = {
        gender: wantToFind === 'all' ? 'all' : wantToFind, // Ensure valid enum value
        ageRange: {
          min: 18,
          max: 100
        },
        distance: 50
      };
    } else {
      // Update only the gender preference, ensuring valid enum value
      user.preferences.gender = wantToFind === 'all' ? 'all' : wantToFind;
    }

    await user.save();

    // Generate presigned URLs for photos
    const photoUrls = await Promise.all(
      user.photos.map(async (photoKey) => {
        return await generatePresignedUrl(photoKey);
      })
    );

    // Generate presigned URL for audio message if exists
    let audioMessageUrl = null;
    if (user.audioMessage) {
      audioMessageUrl = await generatePresignedUrl(user.audioMessage);
    }

    res.status(200).json({
      message: 'Main user information updated successfully',
      user: {
        telegramId: user.telegramId,
        name: user.name,
        gender: user.gender,
        wantToFind: user.wantToFind,
        birthDay: user.birthDay.toISOString().split('T')[0], // Format date as yyyy-MM-dd
        country: user.country,
        city: user.city,
        purpose: user.purpose,
        interests: user.interests,
        photos: photoUrls,
        audioMessage: audioMessageUrl
      }
    });
  } catch (error) {
    console.error('Error updating main user information:', error);
    res.status(500).json({ message: 'Error updating main user information' });
  }
};

exports.updateAudio = async (req, res) => {
  try {
    const { telegramId } = req.body;
    const userId = req.headers['x-user-id'];
    let uploadedAudio = null;

    // Find user by telegramId
    const user = await User.findById({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old audio from S3 if exists
    if (user.audioMessage) {
      try {
        await deleteFromS3(user.audioMessage);
      } catch (error) {
        console.error('Error deleting old audio:', error);
      }
    }

    // Process new audio message if provided
    if (req.files && req.files.audioMessage && req.files.audioMessage[0]) {
      try {
        const audioFile = req.files.audioMessage[0];
        const key = generateMediaKey(telegramId, 'audio', audioFile.originalname);
        const url = await uploadToS3(audioFile, key);
        uploadedAudio = { key, url };
      } catch (error) {
        console.error('Error uploading audio message:', error);
        return res.status(500).json({ message: 'Error uploading audio message' });
      }
    }

    

    // Update user's audio message
    user.audioMessage = uploadedAudio?.url || null;
    await user.save();

    // Generate presigned URL for the new audio message
    let audioMessageUrl = null;
    if (user.audioMessage) {
      audioMessageUrl = await generatePresignedUrl(user.audioMessage);
    }

    res.status(200).json({
      message: 'Audio message updated successfully',
      audioMessage: audioMessageUrl
    });
  } catch (error) {
    console.error('Error updating audio:', error);
    res.status(500).json({ message: 'Error updating audio message' });
  }
};

exports.updatePhotos = async (req, res) => {
  console.log("STARTED UPDATE PHOTOS");
  try {
    const { telegramId } = req.body;
    let uploadedPhotos = [];

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("before delete");

    // Delete old photos from S3
    if (user.photos && user.photos.length > 0) {
      for (const photoKey of user.photos) {
        try {
          console.log("photoKey", photoKey);
          await deleteFromS3(photoKey);
        } catch (error) {
          console.error('Error deleting old photo:', error);
        }
      }
    }
    console.log("after delete");
    console.log("before new upload");

    // Process new photos
    if (req.files) {
      console.log("req.files", req.files);
      try {
        for (const photoFile of req.files) {
          if (photoFile) {
            const key = generateMediaKey(telegramId, 'photos', photoFile.originalname);
            console.log("key", key);
            console.log("photoFile", photoFile);
            const url = await uploadToS3(photoFile, key);
            console.log("url", url);
            uploadedPhotos.push({ key, url });
          }
        }
      } catch (error) {
        console.error("Error uploading photos:", error);
        // Clean up any successfully uploaded photos
        await userService.cleanupUploads(uploadedPhotos, null);
        return res.status(500).json({ message: "Error uploading photos" });
      }
    }
    console.log("after new upload ");

    // Update user's photos while preserving other fields
    const updatedUser = await User.findOneAndUpdate(
      { telegramId },
      { 
        $set: { 
          photos: uploadedPhotos.map(p => p.url)
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Generate presigned URLs for the new photos
    const photoUrls = await Promise.all(
      updatedUser.photos.map(async (photoKey) => {
        return await generatePresignedUrl(photoKey);
      })
    );

    res.status(200).json({
      message: 'Photos updated successfully',
      photos: photoUrls
    });
  } catch (error) {
    console.error('Error updating photos:', error);
    res.status(500).json({ message: 'Error updating photos' });
  }
};

exports.updateInterests = async (req, res) => {
  try {
    const { telegramId, interests } = req.body;

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse interests
    let parsedInterests = [];
    try {
      parsedInterests = Array.isArray(interests) 
        ? interests 
        : typeof interests === 'string' 
          ? interests.split(',').map(i => i.trim()) 
          : [];
    } catch (error) {
      return res.status(400).json({
        message: 'Invalid interests format',
        details: 'Interests should be an array or comma-separated string'
      });
    }

    // Update user's interests
    user.interests = parsedInterests;
    await user.save();

    res.status(200).json({
      message: 'Interests updated successfully',
      interests: user.interests
    });
  } catch (error) {
    console.error('Error updating interests:', error);
    res.status(500).json({ message: 'Error updating interests' });
  }
};

exports.updateMeetGoal = async (req, res) => {
  try {
    const { telegramId, purpose } = req.body;

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user's purpose
    user.purpose = purpose;
    await user.save();

    res.status(200).json({
      message: 'Meet goal updated successfully',
      purpose: user.purpose
    });
  } catch (error) {
    console.error('Error updating meet goal:', error);
    res.status(500).json({ message: 'Error updating meet goal' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (error) {
    if (error.message === 'Invalid profile data') {
      return res.status(400).json({ error: error.errors });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await userService.getAllUsers(page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.userId);
    res.json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
}; 