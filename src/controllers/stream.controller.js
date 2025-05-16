const streamService = require('../services/stream-chat.service');


exports.getStreamerIds = async (req, res) => {
    try {

        const streamerIds = await streamService.getAllStreamerIds();
        console.log(streamerIds);

        
        res.status(200).json({
            status: 'success',
            data: streamerIds
        });


    } catch (error) {
        console.error('Error in getPotentialMatches:', error);
        res.status(400).json({
        status: 'error',
        message: error.message
        });
    }
}