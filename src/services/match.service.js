const Match = require('../models/match.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const { z } = require('zod');
const { generatePresignedUrl } = require('../utils/s3');

const likeSchema = z.object({
  targetUserId: z.string(),
  like: z.boolean()
});

class MatchService {
  async likeUser(userId, targetUserId, like) {
    try {
      const validatedData = likeSchema.parse({
        targetUserId,
        like
      });

      // Check if users exist
      const [user, targetUser] = await Promise.all([
        User.findById(userId),
        User.findById(targetUserId)
      ]);

      if (!user || !targetUser) {
        throw new Error('User not found');
      }

      // Check if match already exists
      let match = await Match.findOne({
        users: { $all: [userId, targetUserId] }
      });

      if (match) {
        // Update existing match
        if (like) {
          match.likes.push({
            user: userId,
            timestamp: new Date()
          });
          
          // Check if both users have liked each other
          const hasMutualLike = match.likes.some(like => 
            like.user.equals(targetUserId)
          );

          if (hasMutualLike) {
            match.status = 'matched';
            // Create chat for matched users
            await this.createChatForMatch(match);
          }
        } else {
          match.status = 'unmatched';
          match.unmatchedBy = userId;
          match.unmatchedAt = new Date();
        }
      } else {
        // Create new match
        match = await Match.create({
          users: [userId, targetUserId],
          likes: like ? [{
            user: userId,
            timestamp: new Date()
          }] : [],
          status: 'pending'
        });
      }

      await match.save();
      return match;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid like data');
      }
      throw error;
    }
  }

  async createChatForMatch(match) {
    try {
      console.log('Creating chat for match:', match._id);
      
      const existingChat = await Chat.findOne({
        match: match._id
      });

      if (existingChat) {
        console.log('Chat already exists for this match');
        return;
      }

      // Get user details for both participants
      console.log('Fetching user details for participants:', match.users);
      const [user1, user2] = await Promise.all([
        User.findById(match.users[0]),
        User.findById(match.users[1])
      ]);

      if (!user1 || !user2) {
        console.error('One or both users not found:', {
          user1: user1 ? 'found' : 'not found',
          user2: user2 ? 'found' : 'not found'
        });
        throw new Error('One or both users not found');
      }

      console.log('Creating new chat with participants:', {
        user1: user1.name,
        user2: user2.name
      });

      // Create chat with participant details
      const newChat = await Chat.create({
        match: match._id,
        participants: [
          {
            userId: user1._id,
            username: user1.name,
            profilePhotos: user1.photos || [],
            age: user1.age,
            telegram_id: user1.telegramId,
            interests: user1.interests || []
          },
          {
            userId: user2._id,
            username: user2.name,
            profilePhotos: user2.photos || [],
            age: user2.age,
            telegram_id: user2.telegramId,
            interests: user2.interests || []
          }
        ],
        messages: [],
        isActive: true
      });

      console.log('Successfully created chat:', newChat._id);
      return newChat;
    } catch (error) {
      console.error('Error creating chat for match:', {
        matchId: match._id,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Error creating chat for match: ${error.message}`);
    }
  }

  async getPotentialMatches(userId, page = 1, limit = 20) {
    userId = '67fba2230bd55a575feb9864';
    try {
      console.log('=== getPotentialMatches Debug ===');
      
      if (!userId) {
        console.error('Error: userId is required but not provided');
        throw new Error('User ID is required');
      }

      const user = await User.findById(userId);
      
      if (!user) {
        console.error('Error: User not found with ID:', userId);
        throw new Error('User not found');
      }

      const existingMatches = await Match.find({
        users: userId
      }).select('users');

      console.log('Existing matches count:', existingMatches.length);

      const excludedUserIds = [
        userId,
        ...existingMatches.map(match => 
          match.users.find(id => !id.equals(userId))
        )
      ];

      const users = await User.find({_id: { $nin: excludedUserIds }});

      // Generate signed URLs for each user's photos
      const usersWithSignedPhotos = await Promise.all(users.map(async (user) => {
        const userObj = user.toObject();
        if (userObj.photos && userObj.photos.length > 0) {
          // Extract the key from the full S3 URL for each photo
          userObj.photos = await Promise.all(userObj.photos.map(async (photoUrl) => {
            try {
              // Extract the key from the full URL
              const key = photoUrl.split('.com/')[1];
              if (!key) {
                console.error('Invalid S3 URL format:', photoUrl);
                return photoUrl;
              }
              // Generate signed URL
              const signedUrl = await generatePresignedUrl(key, 3600); // 1 hour expiration
              return signedUrl;
            } catch (error) {
              console.error('Error generating signed URL:', error);
              return photoUrl;
            }
          }));
        }
        return userObj;
      }));

      console.log('Found potential matches:', usersWithSignedPhotos.length);
      console.log('=== End getPotentialMatches Debug ===');

      return {
        users: usersWithSignedPhotos,
        page,
      };
    } catch (error) {
      console.error('Error in getPotentialMatches:', error);
      throw new Error('Error getting potential matches');
    }
  }

  async getUserMatches(userId, page = 1, limit = 20) {
    try {
      const matches = await Match.find({
        users: userId,
        status: 'matched'
      })
        .populate('users', 'username profilePhotos')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Match.countDocuments({
        users: userId,
        status: 'matched'
      });

      return {
        matches,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error('Error getting user matches');
    }
  }
}

module.exports = new MatchService(); 