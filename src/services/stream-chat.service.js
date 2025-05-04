const StreamChatMessage = require('../models/stream-chat.model');
const User = require('../models/user.model');
const crypto = require('crypto');

class StreamChatService {
    async createStreamChat(streamerId) {
        try {
            console.log('[StreamChatService] Creating stream chat for streamer:', streamerId);
            
            // Get streamer info with username
            const streamer = await User.findById(streamerId).select('name');
            if (!streamer) {
                console.error('[StreamChatService] Streamer not found:', streamerId);
                throw new Error('Streamer not found');
            }

            if (!streamer.name) {
                console.error('[StreamChatService] Streamer username not found:', streamerId);
                throw new Error('Streamer username not found');
            }

            // Delete any existing chat messages for this streamer
            const deleteResult = await StreamChatMessage.deleteMany({ streamId: streamerId });
            console.log('[StreamChatService] Deleted existing chat messages:', deleteResult);

            // Use streamer's ID as streamId
            const streamId = streamerId;

            // Create welcome message with username
            const welcomeMessage = await StreamChatMessage.create({
                streamId,
                userId: streamerId,
                username: streamer.name,
                role: 'streamer',
                message: 'Stream chat has started!'
            });

            console.log('[StreamChatService] Stream chat created successfully:', {
                streamId,
                streamer: streamer.name
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
            // Get user info with username
            console.log('[StreamChatService] Sending message:', message);
            console.log('[StreamChatService] Stream ID:', streamId);
            console.log('[StreamChatService] User ID:', userId);
            
            const user = await User.findById(userId).select('name');
            if (!user) {
                throw new Error('User not found');
            }

            if (!user.name) {
                throw new Error('User username not found');
            }

            // Create new message with username
            const newMessage = await StreamChatMessage.create({
                streamId,
                userId,
                username: user.name,
                role: 'viewer',
                message
            });

            return {
                status: 'success',
                data: {
                    message: newMessage
                }
            };
        } catch (error) {
            console.error('[StreamChatService] Error sending message:', error);
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
                    messages: messages.reverse()
                }
            };
        } catch (error) {
            console.error('[StreamChatService] Error fetching chat history:', error);
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
            console.error('[StreamChatService] Error updating user role:', error);
            throw error;
        }
    }

    async deleteMessage(messageId) {
        try {
            await StreamChatMessage.findByIdAndDelete(messageId);
        } catch (error) {
            console.error('[StreamChatService] Error deleting message:', error);
            throw error;
        }
    }
}

module.exports = new StreamChatService(); 