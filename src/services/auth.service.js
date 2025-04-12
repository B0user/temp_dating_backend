const jwt = require('jsonwebtoken');
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
  wantToFind: z.enum(['male', 'female', 'other']),
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
    const validatedData = registrationSchema.parse(registrationData);
    const parsedInterests = JSON.parse(validatedData.interests);

    // Check if user already exists
    const existingUser = await User.findOne({ telegramId: validatedData.telegramId });
    if (existingUser) {
      throw new Error('User with this Telegram ID already exists');
    }

    // Handle photo uploads
    const photoUrls = [];
    for (let i = 0; i < validatedData.photos.length; i++) {
      const base64Data = validatedData.photos[i];
      const fileExtension = 'jpg'; // Assuming all photos are JPEG
      const key = `users/${validatedData.telegramId}/photos/photo${i + 1}.${fileExtension}`;
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const photoUrl = await uploadToS3(buffer, key, 'image/jpeg');
      photoUrls.push(photoUrl);
    }

    // Handle audio message upload
    let audioMessageUrl = null;
    if (validatedData.audioMessage) {
      const base64Data = validatedData.audioMessage;
      const fileExtension = 'mp3'; // Assuming audio is MP3
      const key = `users/${validatedData.telegramId}/audio/voice.${fileExtension}`;
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
      audioMessageUrl = await uploadToS3(buffer, key, 'audio/mpeg');
    }

    // Create new user
    const user = new User({
      telegramId: validatedData.telegramId,
      username: validatedData.name,
      name: validatedData.name,
      gender: validatedData.gender,
      wantToFind: validatedData.wantToFind,
      birthDay: validatedData.birthDay,
      country: validatedData.country,
      city: validatedData.city,
      location: {
        type: 'Point',
        coordinates: [validatedData.longitude, validatedData.latitude]
      },
      purpose: validatedData.purpose,
      interests: parsedInterests,
      photos: photoUrls,
      audioMessage: audioMessageUrl,
      isVerified: false
    });

    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user) {
      throw new Error('User not found');
    }

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

    const token = this.generateToken(user);
    return {
      token,
      user: {
        ...user.toObject(),
        photos: photoUrls,
        audioMessage: audioMessageUrl
      }
    };
  }

  generateToken(user) {
    return jwt.sign(
      { id: user._id, telegramId: user.telegramId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async validateUser(token) {
    try {
      const decoded = this.verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid authentication');
    }
  }
}

module.exports = new AuthService(); 