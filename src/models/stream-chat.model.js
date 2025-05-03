const mongoose = require('mongoose');

const streamChatMessageSchema = new mongoose.Schema({
    streamId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['viewer', 'streamer', 'moderator'],
        default: 'viewer'
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
streamChatMessageSchema.index({ streamId: 1, timestamp: -1 });

const StreamChatMessage = mongoose.model('StreamChatMessage', streamChatMessageSchema);

module.exports = StreamChatMessage; 