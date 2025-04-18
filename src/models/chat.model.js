const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return !this.media;
    }
  },
  media: {
    type: {
      type: String,
      enum: ['image', 'voice', 'video']
    },
    url: String,
    duration: Number,
    thumbnail: String
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const participantSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  profilePhotos: [String],
  age: Number,
  telegram_id: String,
  interests: [String]
});

const chatSchema = new Schema({
  participants: [participantSchema],
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    type: messageSchema
  },
  typing: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ match: 1 });
chatSchema.index({ 'lastMessage.createdAt': -1 });

// Ensure participants array has exactly 2 unique users
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Chat must have exactly 2 participants'));
  }
  if (this.participants[0].userId.equals(this.participants[1].userId)) {
    return next(new Error('Cannot create a chat with the same user'));
  }
  next();
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; 