const chatService = require('../services/chat.service');

const setupChatSocket = (io) => {
    io.on('connection', (socket) => {
        // console.log('User connected:', socket.id);

        // Join chat room
        socket.on('join-chat', async (chatId) => {
            try {
                socket.join(chatId);
                // console.log(`User ${socket.id} joined chat ${chatId}`);
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

        // Handle disconnection
        socket.on('disconnect', () => {
            // console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = setupChatSocket; 