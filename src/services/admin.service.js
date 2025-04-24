const User = require('../models/user.model');
const { generatePresignedUrl } = require('../utils/s3');

const createBot = async (botData) => {
    try {
        console.log('Creating bot with data:', botData);

        // Check if bot with this telegramId already exists
        const existingBot = await User.findOne({ telegramId: botData.telegramId });
        if (existingBot) {
            throw new Error('Bot with this telegramId already exists');
        }

        // Create location object for geospatial queries
        const location = {
            type: 'Point',
            coordinates: [botData.longitude, botData.latitude]
        };

        // Create the bot user
        const bot = await User.create({
            ...botData,
            location,
            isBot: true, // Mark as bot
            lastActive: new Date(),
            createdAt: new Date()
        });

        console.log('Bot created successfully:', bot._id);

        return bot;
    } catch (error) {
        console.error('Error in createBot:', error);
        throw error;
    }
};

module.exports = {
    createBot
}; 