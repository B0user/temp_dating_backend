const User = require('../models/user.model');
const Stream = require('../models/stream.model');
// const { Op } = require('sequelize');

class RouletteService {
    constructor() {
        this.roulettePool = new Map(); // Map<socketId, {userId, status, preferences}>
        this.activeSessions = new Map(); // Map<userId, {sessionId, partnerId}>
        this.finishedSessions = new Map(); // Map<userId, {sessionId, partnerId}>
    }

    async findMatch(socketId) {
        const currentUser = this.roulettePool.get(socketId);
        if (!currentUser || currentUser.status !== 'pending') {
            return null;
        }

        // Find a matching user from the pool
        for (const [otherSocketId, otherUser] of this.roulettePool.entries()) {
            if (otherSocketId === socketId || otherUser.status !== 'pending') {
                continue;
            }

            // Check if users match each other's preferences
            if (this.usersMatch(currentUser, otherUser)) {
                // Create a unique room ID
                const roomId = `roulette_${currentUser.userId}_${otherUser.userId}`;

                // Update both users' status
                currentUser.status = 'matched';
                otherUser.status = 'matched';

                 // Store session info without stream
                this.activeSessions.set(currentUser.userId, {
                    partnerId: otherUser.userId
                });
                this.activeSessions.set(otherUser.userId, {
                    partnerId: currentUser.userId
                });


                // console.log("MATCH SUCCESS", this.roulettePool);
                // console.log("Active sessions: ", this.activeSessions);

                this.roulettePool.delete(socketId);
                this.roulettePool.delete(otherSocketId);


                // console.log(this.roulettePool);

                return {
                    roomId,
                    partnerSocketId: otherSocketId,
                    matchedUser: otherUser
                };
            }
        }

        return null;
    }

    usersMatch(user1, user2) {
        // Check if users match each other's gender preferences
        const user1PrefersUser2 = user1.preferences.gender === 'all' || 
                                user1.preferences.gender === user2.user_gender;
        const user2PrefersUser1 = user2.preferences.gender === 'all' || 
                                user2.preferences.gender === user1.user_gender;
        return user1PrefersUser2 && user2PrefersUser1;
    }

    async addToPool(socketId, userId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            this.roulettePool.set(socketId, {
                userId: user.id,
                status: 'pending',
                user_gender: user.gender,
                user_interests: user.interests,
                preferences: {
                    gender: user.wantToFind,
                    interests: user.interests
                }
            });


            return true;
        } catch (error) {
            console.error('Error adding user to pool:', error);
            return false;
        }
    }

    removeFromPool(socketId) {
        this.roulettePool.delete(socketId);
    }

    

    async endSession(userId) {
        const session = this.activeSessions.get(userId);
        if (!session) return null;
        
        const { sessionId, partnerId } = session;
        console.log(sessionId, partnerId);

        this.finishedSessions.set(userId, { sessionId, partnerId });
        this.finishedSessions.set(partnerId, { sessionId, partnerId: userId });
    
        this.activeSessions.delete(userId);
        this.activeSessions.delete(partnerId);

        return;
    }

    getCurrentSession(userId) {
        return this.activeSessions.get(userId);
    }

    getPoolStatus() {
        return Array.from(this.roulettePool.entries()).map(([socketId, data]) => ({
            socketId,
            ...data
        }));
    }
}

module.exports = new RouletteService();
