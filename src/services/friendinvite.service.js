const User = require('../models/user.model');
const { z } = require('zod');

const friendInviteSchema = z.object({
  inviterId: z.string(),
  inviteeId: z.string(),
  inviteCode: z.string()
});

class FriendInviteService {
  constructor() {
    this.REWARD_COINS = 350;
    this.REWARD_MATCH_COINS = 3;
    this.REWARD_PREMIUM_DAYS = 3;
    this.REQUIRED_INVITES_FOR_PREMIUM = 3;
  }

  async processInvite(inviteData) {
    try {
      const validatedData = friendInviteSchema.parse(inviteData);

      // Check if the invite has already been processed
      const existingInvite = await User.findOne({
        _id: validatedData.inviteeId,
        'invites.receivedFrom': validatedData.inviterId
      });

      if (existingInvite) {
        throw new Error('Invite has already been processed');
      }

      // Update inviter's rewards
      const inviter = await User.findById(validatedData.inviterId);
      if (!inviter) {
        throw new Error('Inviter not found');
      }

      // Add coins and match gift
      inviter.coins = (inviter.coins || 0) + this.REWARD_COINS;
      inviter.matchCoins = (inviter.matchCoins || 0) + this.REWARD_MATCH_COINS;
      
      // Add "itsamatch" gift
      if (!inviter.gifts) {
        inviter.gifts = [];
      }
      inviter.gifts.push({
        name: 'itsamatch',
        receivedAt: new Date()
      });

      // Count total invites
      const totalInvites = await User.countDocuments({
        'invites.receivedFrom': validatedData.inviterId
      });

      // Add premium days if threshold reached
      if (totalInvites + 1 >= this.REQUIRED_INVITES_FOR_PREMIUM) {
        const currentPremiumEnd = inviter.premiumEnd || new Date();
        inviter.premiumEnd = new Date(currentPremiumEnd.getTime() + (this.REWARD_PREMIUM_DAYS * 24 * 60 * 60 * 1000));
      }

      // Update invitee's record
      const invitee = await User.findById(validatedData.inviteeId);
      if (!invitee) {
        throw new Error('Invitee not found');
      }

      if (!invitee.invites) {
        invitee.invites = [];
      }
      invitee.invites.push({
        receivedFrom: validatedData.inviterId,
        inviteCode: validatedData.inviteCode,
        receivedAt: new Date()
      });

      // Save changes
      await Promise.all([
        inviter.save(),
        invitee.save()
      ]);

      return {
        success: true,
        rewards: {
          coins: this.REWARD_COINS,
          matchCoins: this.REWARD_MATCH_COINS,
          gift: 'itsamatch',
          premiumDays: totalInvites + 1 >= this.REQUIRED_INVITES_FOR_PREMIUM ? this.REWARD_PREMIUM_DAYS : 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async generateInviteCode(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}-${timestamp}-${random}`;
  }
}

module.exports = new FriendInviteService(); 