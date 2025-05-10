const UserDailyLimits = require('../models/user-daily-limits.model');
const User = require('../models/user.model');

class LimitsService {
  static async getOrCreateUserLimits(userId) {
    let limits = await UserDailyLimits.findOne({ userId });
    
    if (!limits) {
      limits = await UserDailyLimits.create({ userId });
    } else if (limits.needsReset()) {
      await limits.resetLimits();
    }
    
    return limits;
  }

  static async checkAndUpdateLimits(userId, action) {
    const user = await User.findById(userId);
    const isPremium = user.wallet.subscription.type === 'premium' && 
                     (!user.wallet.subscription.expiresAt || 
                      user.wallet.subscription.expiresAt > new Date());

    const limits = await this.getOrCreateUserLimits(userId);
    
    // Define limits based on subscription
    const maxLimits = {
      superLikes: isPremium ? 5 : 1,
      returns: isPremium ? 5 : 1,
      mutualLikes: isPremium ? Infinity : 5,
      likes: isPremium ? Infinity : 20 // Example limit for free users
    };

    // Check if user has reached their limit
    switch (action) {
      case 'superLike':
        if (limits.superLikesUsed >= maxLimits.superLikes) {
          throw new Error('Daily super likes limit reached');
        }
        limits.superLikesUsed += 1;
        break;

      case 'return':
        if (limits.returnsUsed >= maxLimits.returns) {
          throw new Error('Daily returns limit reached');
        }
        limits.returnsUsed += 1;
        break;

      case 'mutualLike':
        if (limits.mutualLikesReceived >= maxLimits.mutualLikes) {
          throw new Error('Daily mutual likes limit reached');
        }
        limits.mutualLikesReceived += 1;
        break;

      case 'like':
        if (limits.likesGiven >= maxLimits.likes) {
          throw new Error('Daily likes limit reached');
        }
        limits.likesGiven += 1;
        break;

      default:
        throw new Error('Invalid action');
    }

    await limits.save();
    return true;
  }

  static async canUseFilters(userId) {
    const user = await User.findById(userId);
    return user.wallet.subscription.type === 'premium' && 
           (!user.wallet.subscription.expiresAt || 
            user.wallet.subscription.expiresAt > new Date());
  }
}

module.exports = LimitsService; 