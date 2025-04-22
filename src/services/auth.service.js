const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { z } = require('zod');
const { uploadToS3, generatePresignedUrl } = require('../utils/s3');

const telegramAuthSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  auth_date: z.number(),
  hash: z.string()
});

const registrationSchema = z.object({
  telegramId: z.string(),
  name: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  wantToFind: z.enum(['male', 'female', 'all']),
  birthDay: z.string(),
  country: z.string(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  purpose: z.string(),
  interests: z.string(), // Will be parsed as JSON
  photos: z.array(z.string()), // Base64 strings
  audioMessage: z.string().optional() // Base64 string
});

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
  }

  async verifyTelegramAuth(authData) {
    const validatedData = telegramAuthSchema.parse(authData);

    // Verify Telegram hash
    const dataToCheck = [
      `auth_date=${validatedData.auth_date}`,
      `first_name=${validatedData.first_name}`,
      `id=${validatedData.id}`,
      `last_name=${validatedData.last_name || ''}`,
      `username=${validatedData.username || ''}`
    ].join('\n');

    const crypto = require('crypto');
    const secret = crypto.createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();

    const hash = crypto.createHmac('sha256', secret)
      .update(dataToCheck)
      .digest('hex');

    if (hash !== validatedData.hash) {
      throw new Error('Invalid Telegram authentication data');
    }

    let user = await User.findOne({ telegramId: validatedData.id });
    if (!user) {
      user = new User({
        telegramId: validatedData.id,
        username: validatedData.username || validatedData.first_name,
        profilePhoto: null,
        isVerified: false
      });
      await user.save();
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async register(registrationData) {
    try {
      console.log('=== Auth Service Registration Debug ===');
      console.log('Raw registration data:', JSON.stringify(registrationData, null, 2));

      if (!registrationData) {
        throw new Error('No registration data provided');
      }

      // Parse interests if it's a string
      let parsedInterests;
      if (typeof registrationData.interests === 'string') {
        try {
          parsedInterests = JSON.parse(registrationData.interests);
          console.log('Parsed interests:', parsedInterests);
        } catch (error) {
          console.error('Error parsing interests:', error);
          parsedInterests = [];
        }
      } else {
        parsedInterests = registrationData.interests || [];
      }

      // Create user data object
      const userData = {
        telegramId: registrationData.telegramId,
        name: registrationData.name,
        gender: registrationData.gender,
        wantToFind: registrationData.wantToFind,
        birthDay: registrationData.birthDay,
        country: registrationData.country,
        city: registrationData.city,
        latitude: parseFloat(registrationData.latitude),
        longitude: parseFloat(registrationData.longitude),
        purpose: registrationData.purpose,
        interests: parsedInterests,
        photos: [], // We'll handle photo uploads separately
        audioMessage: null // We'll handle audio upload separately
      };

      console.log('Processed user data:', JSON.stringify(userData, null, 2));

      // Validate the data
      try {
        const validatedData = registrationSchema.parse(userData);
        console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      } catch (validationError) {
        console.error('Validation error:', validationError);
        throw new Error('Validation failed', { details: validationError.errors });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ telegramId: userData.telegramId });
      if (existingUser) {
        throw new Error('User with this Telegram ID already exists');
      }

      // Create new user
      const user = new User({
        telegramId: userData.telegramId,
        name: userData.name,
        gender: userData.gender,
        wantToFind: userData.wantToFind,
        birthDay: userData.birthDay,
        country: userData.country,
        city: userData.city,
        location: {
          type: 'Point',
          coordinates: [userData.longitude, userData.latitude]
        },
        purpose: userData.purpose,
        interests: userData.interests,
        photos: [], // We'll handle photo uploads separately
        audioMessage: null, // We'll handle audio upload separately
        isVerified: false
      });

      console.log('User object to save:', JSON.stringify(user, null, 2));
      await user.save();
      console.log('User saved successfully');

      // Handle file uploads
      if (registrationData.photos && registrationData.photos.length > 0) {
        console.log('Processing photos...');
        for (const photo of registrationData.photos) {
          const photoUrl = await uploadToS3(photo.buffer, photo.originalname, photo.mimetype);
          user.photos.push(photoUrl);
        }
        await user.save();
        console.log('Photos uploaded successfully');
      }

      if (registrationData.audioMessage) {
        console.log('Processing audio message...');
        const audioUrl = await uploadToS3(
          registrationData.audioMessage.buffer,
          registrationData.audioMessage.originalname,
          registrationData.audioMessage.mimetype
        );
        user.audioMessage = audioUrl;
        await user.save();
        console.log('Audio message uploaded successfully');
      }

      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        throw new Error('Validation failed', { details: error.errors });
      }
      throw error;
    }
  }

  async login(telegramId) {
    console.log('Login attempt for telegramId:', telegramId);
    const user = await User.findOne({ telegramId });
    if (!user) {
      console.error('User not found for telegramId:', telegramId);
      throw new Error('User not found');
    }

    // console.log('User found:', user._id);

    // Generate presigned URLs for photos
    const photoUrls = await Promise.all(
      user.photos.map(photo => generatePresignedUrl(photo))
    );
    user.photos = photoUrls;

    // Generate JWT token
    const token = await this.generateToken(user);
    // console.log('Token generated for user:', user._id);

    return { 
      user: user.toObject(), 
      token 
    };
  }

  async validateUser(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async generateToken(user) {
    if (!this.jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      throw new Error('JWT_SECRET is not configured');
    }

    // console.log('Generating token for user:', user._id);
    const token = jwt.sign(
      { userId: user._id },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn || '7d' }
    );
    // console.log('Token generated successfully');
    return token;
  }

  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  async validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async validatePassword(password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
  }
}

module.exports = new AuthService(); 