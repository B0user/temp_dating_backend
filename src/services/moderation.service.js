const User = require('../models/user.model');
const { z } = require('zod');

const verificationActionSchema = z.object({
  userId: z.string(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional()
});

class ModerationService {
  async getPendingVerifications(page = 1, limit = 20) {
    try {
      const users = await User.find({
        verificationStatus: 'pending',
        'verificationPhoto.url': { $exists: true }
      })
        .select('username verificationPhoto verificationStatus')
        .sort({ 'verificationPhoto.submittedAt': 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await User.countDocuments({
        verificationStatus: 'pending',
        'verificationPhoto.url': { $exists: true }
      });

      return {
        users,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error('Error getting pending verifications');
    }
  }

  async handleVerification(moderatorId, verificationData) {
    try {
      const validatedData = verificationActionSchema.parse(verificationData);

      const user = await User.findById(validatedData.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.verificationStatus !== 'pending') {
        throw new Error('User verification is not pending');
      }

      user.verificationStatus = validatedData.action === 'approve' ? 'approved' : 'rejected';
      user.verificationPhoto.reviewedAt = new Date();
      user.verificationPhoto.reviewedBy = moderatorId;

      if (validatedData.reason) {
        user.verificationPhoto.rejectionReason = validatedData.reason;
      }

      await user.save();

      return user;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid verification data');
      }
      throw error;
    }
  }

  async getVerificationHistory(page = 1, limit = 20) {
    try {
      const users = await User.find({
        verificationStatus: { $in: ['approved', 'rejected'] },
        'verificationPhoto.reviewedAt': { $exists: true }
      })
        .select('username verificationPhoto verificationStatus')
        .populate('verificationPhoto.reviewedBy', 'username')
        .sort({ 'verificationPhoto.reviewedAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await User.countDocuments({
        verificationStatus: { $in: ['approved', 'rejected'] },
        'verificationPhoto.reviewedAt': { $exists: true }
      });

      return {
        users,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error('Error getting verification history');
    }
  }

  async getUserVerificationStatus(userId) {
    try {
      const user = await User.findById(userId)
        .select('username verificationPhoto verificationStatus');

      if (!user) {
        throw new Error('User not found');
      }

      return {
        status: user.verificationStatus,
        photo: user.verificationPhoto,
        username: user.username
      };
    } catch (error) {
      throw new Error('Error getting user verification status');
    }
  }
}

module.exports = new ModerationService(); 