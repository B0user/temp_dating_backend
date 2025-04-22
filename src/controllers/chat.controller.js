const chatService = require('../services/chat.service');

const getChatHistory = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        
        const messages = await chatService.getChatHistory(chatId, page, limit);
        res.json({ status: 'success', data: messages });
    } catch (error) {
        console.error('Error in getChatHistory:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getUserChats = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        const chats = await chatService.getUserChats(userId, page, limit);
        res.json({ status: 'success', data: chats });
    } catch (error) {
        console.error('Error in getUserChats:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, media } = req.body;
        const senderId = req.user._id; // Assuming user is attached to request by auth middleware

        const message = await chatService.sendMessage(chatId, senderId, { content, media });
        res.json({ status: 'success', data: message });
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id; // Assuming user is attached to request by auth middleware

        await chatService.markAsRead(chatId, userId);
        res.json({ status: 'success', message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error in markMessagesAsRead:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const updateTypingStatus = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { isTyping } = req.body;
        const userId = req.user._id;

        const typingStatus = await chatService.updateTypingStatus(chatId, userId, isTyping);
        res.json({ status: 'success', data: typingStatus });
    } catch (error) {
        console.error('Error in updateTypingStatus:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getChatHistory,
    getUserChats,
    sendMessage,
    markMessagesAsRead,
    updateTypingStatus
}; 