const StreamChatMessage = require('../models/stream-chat.model');
const User = require('../models/user.model');
const crypto = require('crypto');

class StreamChatService {
    async createStreamChat(streamerId) {
        try {
            console.log('[StreamChatService] Creating stream chat for streamer:', streamerId);
            // Get streamer info
            const streamer = await User.findById(streamerId);
            if (!streamer) {
                console.error('[StreamChatService] Streamer not found:', streamerId);
                throw new Error('Streamer not found');
            }

            // Use streamer's ID as streamId
            const streamId = streamerId;

            // Create welcome message
            const welcomeMessage = await StreamChatMessage.create({
                streamId,
                userId: streamerId,
                username: streamer.username,
                role: 'streamer',
                message: 'Stream chat has started!'
            });

            console.log('[StreamChatService] Stream chat created successfully:', {
                streamId,
                streamer: streamer.username
            });

            return {
                status: 'success',
                data: {
                    streamId,
                    message: welcomeMessage
                }
            };
        } catch (error) {
            console.error('[StreamChatService] Error creating stream chat:', error);
            throw error;
        }
    }

    async sendMessage(streamId, userId, message) {
        try {
            // Get user info
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create new message
            const newMessage = await StreamChatMessage.create({
                streamId,
                userId,
                username: user.username,
                role: 'viewer', // Default role, can be updated based on stream permissions
                message
            });

            return {
                status: 'success',
                data: {
                    message: newMessage
                }
            };
        } catch (error) {
            console.error('Error sending stream message:', error);
            throw error;
        }
    }

    async getChatHistory(streamId, page = 1, limit = 50) {
        try {
            const messages = await StreamChatMessage.find({ streamId })
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            return {
                status: 'success',
                data: {
                    messages: messages.reverse() // Return in chronological order
                }
            };
        } catch (error) {
            console.error('Error fetching stream chat history:', error);
            throw error;
        }
    }

    async updateUserRole(streamId, userId, role) {
        try {
            await StreamChatMessage.updateMany(
                { streamId, userId },
                { $set: { role } }
            );
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    async deleteMessage(messageId) {
        try {
            await StreamChatMessage.findByIdAndDelete(messageId);
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }
}

module.exports = new StreamChatService(); 