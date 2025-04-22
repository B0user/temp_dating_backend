const chatController = require('../controllers/chat.controller');

const setupChatSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

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
                const message = await chatController.sendMessage(chatId, senderId, content);
                
                // Emit to all users in the chat room
                io.to(chatId).emit('new-message', message);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Mark messages as read
        socket.on('mark-read', async (data) => {
            try {
                const { chatId, userId } = data;
                const chat = await chatController.markMessagesAsRead(chatId, userId);
                
                // Notify other users in the chat
                socket.to(chatId).emit('messages-read', { chatId, userId });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = setupChatSocket; 