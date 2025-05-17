const rouletteService = require('../services/roulette.service');

module.exports = (io) => {
    const rouletteNamespace = io.of('/roulette');

    rouletteNamespace.on('connection', (socket) => {
        console.log('User connected to roulette namespace:', socket.id);

        // Handle join request
        socket.on('join_chat_roulette', async ({ userId }) => {
            console.log('join_chat_roulette');
            try {
                const added = await rouletteService.addToPool(socket.id, userId);

                if (!added) {
                    socket.emit('roulette_error', { message: 'Failed to join roulette pool' });
                    return;
                }

                const match = await rouletteService.findMatch(socket.id);

                // console.log("match", match);

                if (match) {
                    // socket.join(match.roomId);
                    // socket.to(match.partnerSocketId).join(match.roomId); // partner joins too
                    // console.log(match.partnerSocketId);
                    rouletteNamespace.to(match.partnerSocketId).emit('roulette_matched', {
                        roomId: match.roomId,
                        matchedUserId: userId
                    });
                    rouletteNamespace.to(socket.id).emit('roulette_matched', {
                        roomId: match.roomId,
                        matchedUserId: match.matchedUser.userId
                    });
                }
            } catch (error) {
                console.error('Error in join_chat_roulette:', error);
                socket.emit('roulette_error', { message: 'Internal server error' });
            }
        });

        // Handle message
        socket.on('roulette_message', ({ roomId, message }) => {
            console.log('roulette_message');
            rouletteNamespace.to(roomId).emit('roulette_message', { message });
        });

        // Leave / End chat manually
        socket.on('leave_roulette', async () => {
            console.log('leave_roulette');
            try {
                const session = rouletteService.getCurrentSession(socket.id);
                if (session) {
                    const result = await rouletteService.endSession(socket.id);
                    if (result) {
                        rouletteNamespace.to(result.roomId).emit('roulette_chat_ended', {
                            reason: 'partner_left',
                            streamId: result.streamId
                        });
                    }
                }
                rouletteService.removeFromPool(socket.id);
                socket.emit('roulette_left');
            } catch (error) {
                console.error('Error in leave_roulette:', error);
                socket.emit('roulette_error', { message: 'Failed to leave roulette' });
            }
        });

        // End chat explicitly
        socket.on('end_roulette_session', async ({ userId }) => {
            console.log('end_roulette_session');
            try {
                const session = rouletteService.getCurrentSession(userId);
                if (session) await rouletteService.endSession(userId);
            } catch (error) {
                console.error('Error ending roulette chat:', error);
                socket.emit('roulette_error', { message: 'Failed to end chat' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log('disconnect');
            try {
                const session = rouletteService.getCurrentSession(socket.id);
                if (session) {
                    const result = await rouletteService.endSession(socket.id);
                    if (result) {
                        rouletteNamespace.to(result.roomId).emit('roulette_chat_ended', {
                            reason: 'partner_disconnected',
                            streamId: result.streamId
                        });
                    }
                }
                rouletteService.removeFromPool(socket.id);
                console.log('User disconnected from roulette:', socket.id);
            } catch (error) {
                console.error('Error during disconnect:', error);
            }
        });
    });

    return rouletteNamespace;
};
