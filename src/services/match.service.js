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

  async getPotentialMatches(userId, page = 1, limit = 20) {
    try {
      console.log('=== getPotentialMatches Debug ===');
      console.log('Using userId:', userId);
      
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