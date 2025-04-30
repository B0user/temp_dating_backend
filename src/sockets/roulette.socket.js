const rouletteService = require('../services/roulette.service');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected to roulette:', socket.id);

        // Handle join chat roulette request
        socket.on('join-chat-roulette-request', async ({ userId }) => {
            try {
                // Add user to the roulette pool
                const added = await rouletteService.addToPool(socket.id, userId);
                
                if (!added) {
                    socket.emit('roulette-error', { message: 'Failed to join roulette pool' });
                    return;
                }

                // Try to find a match
                const match = rouletteService.findMatch(socket.id);

                if (match) {
                    // Create a room for the matched users
                    socket.join(match.roomId);
                    socket.to(match.roomId).join(match.roomId);

                    // Notify both users about the match
                    io.to(match.roomId).emit('roulette-chat-id-response', {
                        roomId: match.roomId,
                        matchedUserId: match.matchedUser.userId
                    });
                }
            } catch (error) {
                console.error('Error in join-chat-roulette-request:', error);
                socket.emit('roulette-error', { message: 'Internal server error' });
            }
        });

        // Handle leaving the roulette
        socket.on('leave-roulette', () => {
            rouletteService.removeFromPool(socket.id);
            socket.emit('roulette-left');
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            rouletteService.removeFromPool(socket.id);
            console.log('User disconnected from roulette:', socket.id);
        });

        // Handle chat messages in the roulette room
        socket.on('roulette-message', ({ roomId, message }) => {
            socket.to(roomId).emit('roulette-message', {
                userId: socket.id,
                message
            });
        });

        // Handle ending the chat
        socket.on('end-roulette-chat', ({ roomId }) => {
            socket.to(roomId).emit('roulette-chat-ended');
            socket.leave(roomId);
        });
    });
};
