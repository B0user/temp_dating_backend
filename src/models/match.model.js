const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchSchema = new Schema({
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'matched', 'unmatched'],
    default: 'pending'
  },
  lastInteraction: Date,
  likes: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }],
  unmatchedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  unmatchedAt: Date,
  matchScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
matchSchema.index({ users: 1 });
matchSchema.index({ status: 1, lastInteraction: -1 });

// Ensure users array has exactly 2 unique users
matchSchema.pre('save', function(next) {
  if (this.users.length !== 2) {
    return next(new Error('Match must have exactly 2 users'));
  }
  if (this.users[0].equals(this.users[1])) {
    return next(new Error('Cannot match a user with themselves'));
  }
  next();
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match; 