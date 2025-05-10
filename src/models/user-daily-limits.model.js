const mongoose = require('mongoose');
const { Schema } = mongoose;

const userDailyLimitsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  superLikesUsed: {
    type: Number,
    default: 0
  },
  returnsUsed: {
    type: Number,
    default: 0
  },
  mutualLikesReceived: {
    type: Number,
    default: 0
  },
  likesGiven: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userDailyLimitsSchema.index({ userId: 1, lastResetDate: 1 });

// Method to check if limits need to be reset
userDailyLimitsSchema.methods.needsReset = function() {
  const now = new Date();
  const lastReset = new Date(this.lastResetDate);
  return now.getDate() !== lastReset.getDate() || 
         now.getMonth() !== lastReset.getMonth() || 
         now.getFullYear() !== lastReset.getFullYear();
};

// Method to reset limits
userDailyLimitsSchema.methods.resetLimits = function() {
  this.superLikesUsed = 0;
  this.returnsUsed = 0;
  this.mutualLikesReceived = 0;
  this.likesGiven = 0;
  this.lastResetDate = new Date();
  return this.save();
};

const UserDailyLimits = mongoose.model('UserDailyLimits', userDailyLimitsSchema);

module.exports = UserDailyLimits; 