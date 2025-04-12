const chatService = require('../services/chat.service');
const authService = require('../services/auth.service');

function setupChatSocket(io) {
  const chatNamespace = io.of('/chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const user = await authService.validateUser(token);
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    console.log(`User connected to chat: ${socket.user.username}`);

    // Join user's chat rooms
    socket.on('join-chats', async (chatIds) => {
      try {
        chatIds.forEach(chatId => {
          socket.join(`chat:${chatId}`);
        });
      } catch (error) {
        socket.emit('error', { message: 'Error joining chats' });
      }
    });

    // Handle new messages
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, media } = data;
        const message = await chatService.sendMessage(chatId, socket.user._id, { content, media });

        // Broadcast to all users in the chat room
        chatNamespace.to(`chat:${chatId}`).emit('new-message', {
          chatId,
          message
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing status
    socket.on('typing', async (data) => {
      try {
        const { chatId, isTyping } = data;
        const typingStatus = await chatService.updateTypingStatus(chatId, socket.user._id, isTyping);

        // Broadcast to all users in the chat room except sender
        socket.to(`chat:${chatId}`).emit('typing-status', {
          chatId,
          typing: typingStatus
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle read receipts
    socket.on('mark-read', async (data) => {
      try {
        const { chatId } = data;
        await chatService.markAsRead(chatId, socket.user._id);

        // Broadcast to all users in the chat room
        chatNamespace.to(`chat:${chatId}`).emit('messages-read', {
          chatId,
          userId: socket.user._id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected from chat: ${socket.user.username}`);
    });
  });
}

module.exports = setupChatSocket; 