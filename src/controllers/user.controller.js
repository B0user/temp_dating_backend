const User = require('../models/user.model');
const { uploadToS3, generatePresignedUrl, deleteFromS3, generateMediaKey } = require('../utils/s3');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  let uploadedPhotos = [];
  let uploadedAudio = null;

  try {
    // logger.info('Registration request received');
    // logger.debug('Request body:', JSON.stringify(req.body, null, 2));

    // Check for empty request body 
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.error('Empty request body received');
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          requiredFields: [
            'telegramId', 'name', 'gender', 'wantToFind', 'birthDay',
            'country', 'city', 'latitude', 'longitude', 'purpose', 'interests'
          ]
        }
      });
    }

    // Extract and validate fields
    const {
      telegramId, name, gender, wantToFind, birthDay,
      country, city, latitude, longitude, purpose, interests
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!telegramId) missingFields.push('telegramId');
    if (!name) missingFields.push('name');
    if (!gender) missingFields.push('gender');
    if (!wantToFind) missingFields.push('wantToFind');
    if (!birthDay) missingFields.push('birthDay');
    if (!country) missingFields.push('country');
    if (!city) missingFields.push('city');
    if (!latitude) missingFields.push('latitude');
    if (!longitude) missingFields.push('longitude');
    if (!purpose) missingFields.push('purpose');
    if (!interests) missingFields.push('interests');

    if (missingFields.length > 0) {
      logger.error('Missing required fields:', missingFields);
      return res.status(400).json({
        error: 'Missing required fields',
        details: { missingFields }
      });
    }

    // Validate gender and wantToFind enums
    const validGenders = ['male', 'female', 'other'];
    const validWantToFind = ['male', 'female', 'all'];

    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender',
        details: { validOptions: validGenders }
      });
    }

    if (!validWantToFind.includes(wantToFind)) {
      return res.status(400).json({
        error: 'Invalid wantToFind',
        details: { validOptions: validWantToFind }
      });
    }

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
            const url = await uploadToS3(photoFile[0], key);
            uploadedPhotos.push({ key, url });
          } catch (error) {
            logger.error(`Error uploading photo${i}:`, error.message);
            // Clean up any successfully uploaded photos
            await cleanupUploads(uploadedPhotos, uploadedAudio);
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
        // Clean up uploaded photos
        await cleanupUploads(uploadedPhotos, uploadedAudio);
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
      await cleanupUploads(uploadedPhotos, uploadedAudio);
      return res.status(400).json({
        error: 'Invalid interests format',
        details: { 
          message: 'Interests should be an array or comma-separated string'
        }
      });
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
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      purpose,
      interests: parsedInterests,
      photos: uploadedPhotos.map(p => p.url),
      audioMessage: uploadedAudio?.url
    });

    // Save user and verify the save was successful
    try {
      const savedUser = await user.save();
      
      // Verify the user was actually saved
      const verifiedUser = await User.findById(savedUser._id);
      if (!verifiedUser) {
        throw new Error('User was not properly saved to the database');
      }

      // Generate JWT token
      const token = generateToken(telegramId);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: verifiedUser._id,
          telegramId: verifiedUser.telegramId,
          name: verifiedUser.name,
          photos: verifiedUser.photos,
          audioMessage: verifiedUser.audioMessage
        }
      });
    } catch (saveError) {
      logger.error('Error saving user to database:', saveError.message);
      await cleanupUploads(uploadedPhotos, uploadedAudio);
      return res.status(500).json({
        error: 'Failed to save user',
        details: {
          message: saveError.message
        }
      });
    }

  } catch (error) {
    logger.error('Registration error:', error.message);
    await cleanupUploads(uploadedPhotos, uploadedAudio);
    
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

exports.login = async (req, res) => {
  try {
    const { telegramId } = req.body;

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate JWT token
    const token = generateToken(telegramId);

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
      message: 'Login successful',
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
    });
  } catch (error) {
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
    const { telegramId, name, gender, wantToFind, birthDay, country, city } = req.body;

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update main user information
    user.name = name;
    user.gender = gender;
    user.wantToFind = wantToFind;
    user.birthDay = birthDay;
    user.country = country;
    user.city = city;

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
        birthDay: user.birthDay,
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