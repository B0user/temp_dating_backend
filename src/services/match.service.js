const Match = require('../models/match.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const { z } = require('zod');

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
      const existingChat = await Chat.findOne({
        match: match._id
      });

      if (!existingChat) {
        await Chat.create({
          match: match._id,
          participants: match.users,
          messages: [],
          isActive: true
        });
      }
    } catch (error) {
      throw new Error('Error creating chat for match');
    }
  }

  async getPotentialMatches(userId, page = 1, limit = 20) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get users that haven't been matched or liked yet
      const existingMatches = await Match.find({
        users: userId
      }).select('users');

      const excludedUserIds = [
        userId,
        ...existingMatches.map(match => 
          match.users.find(id => !id.equals(userId))
        )
      ];

      // Get potential matches based on preferences
      const query = {
        _id: { $nin: excludedUserIds },
        verificationStatus: 'approved'
      };

      if (user.preferences) {
        if (user.preferences.gender) {
          query.gender = user.preferences.gender;
        }
        if (user.preferences.ageRange) {
          query.age = {
            $gte: user.preferences.ageRange.min,
            $lte: user.preferences.ageRange.max
          };
        }
      }

      const users = await User.find(query)
        .select('username profilePhotos bio interests')
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        users,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
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