const Match = require('../models/match.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const { z } = require('zod');
const { generatePresignedUrl } = require('../utils/s3');
const mongoose = require('mongoose');

const likeSchema = z.object({
  targetUserId: z.string(),
  like: z.boolean()
});

const superLikeSchema = z.object({
  targetUserId: z.string()
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
        User.findById(match.users[0]).select('name photos birthDay interests audioMessage gender bio country city purpose preferences'),
        User.findById(match.users[1]).select('name photos birthDay interests audioMessage gender bio country city purpose preferences')
      ]);

      if (!user1 || !user2) {
        console.error('One or both users not found:', {
          user1: user1 ? 'found' : 'not found',
          user2: user2 ? 'found' : 'not found'
        });
        throw new Error('One or both users not found');
      }


      // Format participant data
      const formatParticipant = (user) => {
        if (!user.name) {
          console.error('User name is missing:', user);
          throw new Error('User name is required');
        }

        console.log('Formatting participant:', {
          _id: user._id,
          name: user.name,
          birthDay: user.birthDay,
          photos: user.photos
        });

        const participant = {
          _id: user._id,
          userId: user._id,  // Required by Chat model
          username: user.name,
          photos: user.photos || [],
          birthDay: user.birthDay,
          interests: user.interests || [],
          audioMessage: user.audioMessage || null,
          gender: user.gender || null,
          bio: user.bio || null,
          location: {
            country: user.country || null,
            city: user.city || null
          },
          purpose: user.purpose || null,
          preferences: user.preferences || {}
        };

        console.log('Formatted participant:', participant);
        return participant;
      };

      // Create chat with formatted participant details
      const participants = [
        formatParticipant(user1),
        formatParticipant(user2)
      ];

      console.log('Creating chat with participants:', participants);

      const newChat = await Chat.create({
        match: match._id,
        participants,
        messages: [],
        isActive: true
      });

      console.log('Successfully created chat:', {
        chatId: newChat._id,
        participants: newChat.participants.map(p => ({
          _id: p._id,
          userId: p.userId,
          name: p.username,
          birthDay: p.birthDay
        }))
      });
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

  calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async getPotentialMatches(userId, filters, page = 1, limit = 20) {
    try {
      if (!userId) {
        console.error('Error: userId is required but not provided');
        throw new Error('User ID is required');
      }

      // Ensure userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error('Invalid user ID format:', userId);
        throw new Error(`Invalid user ID format. Expected 24-character hex string, got ${userId.length} characters`);
      }

      // Convert string to ObjectId
      const userObjectId = new mongoose.Types.ObjectId(userId);
      
      const user = await User.findById(userObjectId);
      
      if (!user) {
        console.error('Error: User not found with ID:', userId);
        throw new Error('User not found');
      }

      const existingMatches = await Match.find({
        users: userObjectId
      }).select('users');

      const excludedUserIds = [
        userObjectId,
        ...existingMatches.map(match => 
          match.users.find(id => !id.equals(userObjectId))
        )
      ];

      // Build query based on filters
      const query = {
        _id: { $nin: excludedUserIds },
        gender: filters.gender === 'all' ? { $in: ['male', 'female'] } : filters.gender
      };

      // Add age range filter
      if (filters.ageRange) {
        query.birthDay = {
          $lte: new Date(new Date().setFullYear(new Date().getFullYear() - filters.ageRange.min)),
          $gte: new Date(new Date().setFullYear(new Date().getFullYear() - filters.ageRange.max))
        };
      }

      // Add distance filter if location is available
      if (user.latitude && user.longitude && filters.distance) {
        query.location = {
          $geoWithin: {
            $centerSphere: [
              [user.longitude, user.latitude],
              filters.distance / 6378.1 // Convert km to radians
            ]
          }
        };
      }

      // Add interests filter if specified
      if (filters.interests && filters.interests.length > 0) {
        query.interests = { $in: filters.interests };
      }

      // First get total count
      const total = await User.countDocuments(query);

      // Then get paginated results
      const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(limit);

      // Generate signed URLs for each user's photos
      const usersWithSignedPhotos = await Promise.all(users.map(async (user) => {
        const userObj = user.toObject();
        if (userObj.photos && userObj.photos.length > 0) {
          userObj.photos = await Promise.all(userObj.photos.map(async (photoUrl) => {
            try {
              const key = photoUrl.split('.com/')[1];
              if (!key) {
                console.error('Invalid S3 URL format:', photoUrl);
                return photoUrl;
              }
              const signedUrl = await generatePresignedUrl(key, 3600);
              return signedUrl;
            } catch (error) {
              console.error('Error generating signed URL:', error);
              return photoUrl;
            }
          }));
        }
        return userObj;
      }));

      return {
        users: usersWithSignedPhotos,
        page,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error in getPotentialMatches:', error);
      throw error;
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

  async superLikeUser(userId, targetUserId) {
    try {
      const validatedData = superLikeSchema.parse({
        targetUserId
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
        // Update existing match with super like
        match.superLikes = match.superLikes || [];
        match.superLikes.push({
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
        // Create new match with super like
        match = await Match.create({
          users: [userId, targetUserId],
          superLikes: [{
            user: userId,
            timestamp: new Date()
          }],
          status: 'pending'
        });
      }

      await match.save();
      return match;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid super like data');
      }
      throw error;
    }
  }

  async returnProfile(userId, targetUserId) {
    try {
      // Check if users exist
      const [user, targetUser] = await Promise.all([
        User.findById(userId),
        User.findById(targetUserId)
      ]);

      if (!user || !targetUser) {
        throw new Error('User not found');
      }

      // Find the match
      const match = await Match.findOne({
        users: { $all: [userId, targetUserId] }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Add return to the match
      match.returns = match.returns || [];
      match.returns.push({
        user: userId,
        timestamp: new Date()
      });

      // If the target user has already liked, create a match
      const hasTargetLike = match.likes.some(like => 
        like.user.equals(targetUserId)
      );

      if (hasTargetLike) {
        match.status = 'matched';
        // Create chat for matched users
        await this.createChatForMatch(match);
      }

      await match.save();
      return match;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MatchService(); 