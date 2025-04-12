const mongoose = require('mongoose');
const { Schema } = mongoose;

const streamSchema = new Schema({
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['live', 'roulette'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'paused'],
    default: 'active'
  },
  title: String,
  description: String,
  thumbnail: String,
  viewers: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date
  }],
  currentViewers: {
    type: Number,
    default: 0
  },
  maxViewers: {
    type: Number,
    default: 0
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number,
  tags: [String],
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For roulette specific fields
  rouletteSession: {
    participants: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: Date,
      leftAt: Date,
      skipped: Boolean
    }],
    currentPair: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    sessionDuration: {
      type: Number,
      default: 20 // 20 seconds for roulette
    }
  },
  // For live streaming specific fields
  liveStream: {
    streamKey: String,
    streamUrl: String,
    recordingUrl: String,
    isRecording: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
streamSchema.index({ host: 1, status: 1 });
streamSchema.index({ type: 1, status: 1 });
streamSchema.index({ startedAt: -1 });
streamSchema.index({ 'viewers.user': 1 });

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream; 