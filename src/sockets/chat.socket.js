const chatService = require('../services/chat.service');
const streamChatService = require('../services/stream-chat.service');

const setupChatSocket = (io) => {
    io.on('connection', (socket) => {
        // console.log('User connected:', socket.id);

        // Join chat room
        socket.on('join-chat', async (chatId) => {
            try {
                socket.join(chatId);
                console.log(`User ${socket.id} joined chat ${chatId}`);
            } catch (error) {
                console.error('Error joining chat:', error);
            }
        });

        // Send message
        socket.on('send-message', async (data) => {
            try {
                const { chatId, senderId, content } = data;
                const message = await chatService.sendMessage(chatId, senderId, content);
                
                // Get updated chat history
                const chatHistory = await chatService.getChatHistory(chatId);
                
                // Emit to all users in the chat room with both message and history
                io.to(chatId).emit('new-message', {
                    message: message.data.message,
                    chatHistory: chatHistory
                });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Mark messages as read
        socket.on('mark-read', async (data) => {
            try {
                const { chatId, userId } = data;
                const chat = await chatService.markMessagesAsRead(chatId, userId);
                
                // Notify other users in the chat
                socket.to(chatId).emit('messages-read', { chatId, userId });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Stream chat events
        socket.on('create-stream-chat', async (data) => {
            try {
                console.log('[STREAM CHAT SOCKET] Creating stream chat');
                const { streamerId } = data;
                
                // Create stream chat and get generated streamId
                const result = await streamChatService.createStreamChat(streamerId);
                const { streamId } = result.data;
                
                // Join the stream chat room
                socket.join(`stream-${streamId}`);
                
                // Notify the streamer with the streamId
                socket.emit('stream-chat-created', {
                    streamId,
                    welcomeMessage: result.data.message
                });
            } catch (error) {
                console.error('Error creating stream chat:', error);
                socket.emit('error', { message: 'Failed to create stream chat' });
            }
        });

        socket.on('join-chat-stream', async (streamId) => {
            try {
                socket.join(`stream-${streamId}`);
                console.log(`User ${socket.id} joined stream chat ${streamId}`);

                // Send initial chat history
                const history = await streamChatService.getChatHistory(streamId);
                socket.emit('stream-chat-history', history);
            } catch (error) {
                console.error('Error joining stream chat:', error);
                socket.emit('error', { message: 'Failed to join stream chat' });
            }
        });

        socket.on('send-message-stream', async (data) => {
            try {
                const { streamId, userId, message } = data;
                const result = await streamChatService.sendMessage(streamId, userId, message);
                
                // Get updated chat history
                const history = await streamChatService.getChatHistory(streamId);
                
                // Emit to all users in the stream chat room
                io.to(`stream-${streamId}`).emit('new-message-stream', {
                    message: result.data.message,
                    chatHistory: history
                });
            } catch (error) {
                console.error('Error sending stream message:', error);
                socket.emit('error', { message: 'Failed to send stream message' });
            }
        });

        socket.on('update-stream-role', async (data) => {
            try {
                const { streamId, userId, role } = data;
                await streamChatService.updateUserRole(streamId, userId, role);
                
                // Notify all users in the stream chat
                io.to(`stream-${streamId}`).emit('stream-role-updated', { userId, role });
            } catch (error) {
                console.error('Error updating stream role:', error);
                socket.emit('error', { message: 'Failed to update stream role' });
            }
        });

        socket.on('delete-stream-message', async (data) => {
            try {
                const { messageId, streamId } = data;
                await streamChatService.deleteMessage(messageId);
                
                // Get updated chat history
                const history = await streamChatService.getChatHistory(streamId);
                
                // Notify all users in the stream chat
                io.to(`stream-${streamId}`).emit('stream-message-deleted', {
                    messageId,
                    chatHistory: history
                });
            } catch (error) {
                console.error('Error deleting stream message:', error);
                socket.emit('error', { message: 'Failed to delete stream message' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = setupChatSocket; 