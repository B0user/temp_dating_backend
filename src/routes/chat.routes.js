const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Get user's chats
router.get('/', chatController.getUserChats);

// Get chat history
router.get('/:chatId', chatController.getChatHistory);

// Send message
router.post('/:chatId/messages', chatController.sendMessage);

// Mark messages as read
router.post('/:chatId/read', chatController.markAsRead);

// Update typing status
router.post('/:chatId/typing', chatController.updateTypingStatus);

// Get chat history
// router.get('/:chatId/history', chatController.getChatHistory);

// Get user's chats
// router.get('/user/:userId', chatController.getUserChats);

module.exports = router; 