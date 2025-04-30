const User = require('../models/User');
// const { Op } = require('sequelize');

class RouletteService {
    constructor() {
        this.roulettePool = new Map(); // Map<socketId, {userId, status, preferences}>
    }

    async addToPool(socketId, userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'gender', 'wantToFind', 'interests']
            });

            if (!user) {
                throw new Error('User not found');
            }

            this.roulettePool.set(socketId, {
                userId: user.id,
                status: 'pending',
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

    findMatch(socketId) {
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
            const currentUserMatchesOther = this.checkPreferences(
                currentUser.preferences,
                otherUser.preferences
            );
            const otherUserMatchesCurrent = this.checkPreferences(
                otherUser.preferences,
                currentUser.preferences
            );

            if (currentUserMatchesOther && otherUserMatchesCurrent) {
                // Mark both users as locked
                this.roulettePool.set(socketId, { ...currentUser, status: 'locked' });
                this.roulettePool.set(otherSocketId, { ...otherUser, status: 'locked' });

                return {
                    roomId: `${socketId}-${otherSocketId}`,
                    matchedUser: otherUser
                };
            }
        }

        return null;
    }

    checkPreferences(userPrefs, otherUserPrefs) {
        // Check gender preference
        if (userPrefs.gender && userPrefs.gender !== otherUserPrefs.gender) {
            return false;
        }

        // Check interests (if both have interests)
        if (userPrefs.interests && otherUserPrefs.interests) {
            const commonInterests = userPrefs.interests.filter(interest => 
                otherUserPrefs.interests.includes(interest)
            );
            return commonInterests.length > 0;
        }

        return true;
    }

    getPoolStatus() {
        return Array.from(this.roulettePool.entries()).map(([socketId, data]) => ({
            socketId,
            ...data
        }));
    }
}

module.exports = new RouletteService();
