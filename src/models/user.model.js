const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  wantToFind: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  birthDay: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  purpose: {
    type: String,
    required: true
  },
  interests: [{
    type: String
  }],
  photos: [{
    type: String // S3 keys for photos
  }],
  audioMessage: {
    type: String // S3 key for audio message
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verification: {
    photo: {
      type: String, // S3 key for verification photo
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      default: null
    }
  },
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'subscription', 'gift'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    subscription: {
      type: {
        type: String,
        enum: ['free', 'premium', 'vip'],
        default: 'free'
      },
      expiresAt: {
        type: Date,
        default: null
      }
    }
  },
  preferences: {
    ageRange: {
      min: {
        type: Number,
        default: 18
      },
      max: {
        type: Number,
        default: 100
      }
    },
    distance: {
      type: Number,
      default: 50 // in kilometers
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });

// Index for telegramId
userSchema.index({ telegramId: 1 });

// Index for verification status
userSchema.index({ 'verification.status': 1 });

// Index for subscription type
userSchema.index({ 'wallet.subscription.type': 1 });

// Index for lastActive
userSchema.index({ lastActive: 1 });

// Method to update lastActive
userSchema.methods.updateLastActive = async function() {
  this.lastActive = new Date();
  await this.save();
};

// Method to check if user is premium
userSchema.methods.isPremium = function() {
  return this.wallet.subscription.type !== 'free' && 
         (!this.wallet.subscription.expiresAt || this.wallet.subscription.expiresAt > new Date());
};

// Method to check if user is verified
userSchema.methods.isVerified = function() {
  return this.verification.status === 'approved';
};

const User = mongoose.model('User', userSchema);

module.exports = User; 