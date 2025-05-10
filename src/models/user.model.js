const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchemaNew = new Schema({
  account_information: {
    telegramId: {
      type: String,
      unique: true,
      trim: true
    },
    media: {
      photos: [{
        type: String,
      }],
      audioMessage: {
        type: String,
      },
    },
    wallet: {
    },
    verification: {
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
  },
  personal_information: {
    name: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },
    birthDay: {
      type: Date,
    },
    location_general: {
      country: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      location: {
        type: { 
          type: String,
          enum: ['Point'],
          required: true
        },
        coordinates: {
          type: [Number],
          required: true
        }
      },
    },
    purpose: {
      type: String,
      trim: true
    },
    interests: [{
      type: String,
      trim: true
    }]
  },
  match_preferences: {
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
        default: 50
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'all'],
        default: 'other'
      }
    },
    filters: {
      targetGender: {
        type: String,
        enum: ['male', 'female', 'all'],
        default: 'all'
      },
      purpose: {
        type: String,
        trim: true
      },
      interests: [{
        type: String,
        trim: true
      }],
    },
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
  
});

const userSchema = new Schema({
  telegramId: {
    type: String,
    // required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    // required: true,
    trim: true
  },
  gender: {
    type: String,
    // required: true,
    // enum: ['male', 'female', 'other']
  },
  wantToFind: {
    type: String,
    // required: true,
    // enum: ['male', 'female', 'all']
  },
  birthDay: {
    type: Date,
    // required: true
  },
  country: {
    type: String,
    // required: true,
    trim: true
  },
  city: {
    type: String,
    // required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      // enum: ['Point'],
      // required: true
    },
    coordinates: {
      type: [Number],
      // required: true
    }
  },
  purpose: {
    type: String,
    // required: true,
    trim: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  photos: [{
    type: String, // URLs to photos in S3
    trim: true
  }],
  audioMessage: {
    type: String, // URL to audio message in S3
    trim: true
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
      // enum: ['pending', 'approved', 'rejected'],
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
    coins: {
      type: Number,
      default: 0
    },
    mytaCoins: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        // enum: ['deposit', 'withdrawal', 'subscription', 'gift'],
        // required: true
      },
      amount: {
        type: Number,
        // required: true
      },
      currency: {
        type: String,
        // enum: ['coins', 'mytaCoins'],
        // required: true
      },
      status: {
        type: String,
        // enum: ['pending', 'completed', 'failed'],
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
        // enum: ['free', 'premium'],
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
      enum: ['male', 'female', 'all'],
      default: 'other'
    }
  },
  filters: {
    gender: {
      type: String,
      enum: ['male', 'female', 'all'],
      default: 'all'
    },
    purpose: {
      type: String,
      trim: true
    },
    interests: [{
      type: String,
      trim: true
    }],
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
    distanceRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 100
      }
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
userSchema.methods.checkVerificationStatus = function() {
  return this.verification.status === 'approved';
};

const User = mongoose.model('User', userSchema);

module.exports = User; 