const express = require('express');
const router = express.Router();
const chatService = require('../services/chat.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Get user's chats
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId } = req.query;
    console.log('User ID from query:', userId);
    const result = await chatService.getUserChats(userId, parseInt(page), parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get chat history
router.get('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await chatService.getChatHistory(
      req.params.chatId,
      req.body.userId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Send message
router.post('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const message = await chatService.sendMessage(
      req.params.chatId,
      req.body.userId,
      req.body
    );

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Mark messages as read
router.post('/:chatId/read', authMiddleware, async (req, res) => {
  try {
    await chatService.markAsRead(req.params.chatId, req.body.userId);

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update typing status
router.post('/:chatId/typing', authMiddleware, async (req, res) => {
  try {
    const { isTyping } = req.body;
    const typingStatus = await chatService.updateTypingStatus(
      req.params.chatId,
      req.body.userId,
      isTyping
    );

    res.status(200).json({
      status: 'success',
      data: {
        typing: typingStatus
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 