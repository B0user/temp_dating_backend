const express = require('express');
const router = express.Router();
const chatService = require('../services/chat.service');

// Get user's chats
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.headers['x-user-id'];
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
router.get('/:chatId', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.headers['x-user-id'];
    const result = await chatService.getChatHistory(
      req.params.chatId,
      userId,
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
router.post('/:chatId/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const message = await chatService.sendMessage(
      req.params.chatId,
      userId,
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
router.post('/:chatId/read', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    await chatService.markAsRead(req.params.chatId, userId);

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
router.post('/:chatId/typing', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    const { isTyping } = req.body;
    const typingStatus = await chatService.updateTypingStatus(
      req.params.chatId,
      userId,
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

// Get chat history
// router.get('/:chatId/history', chatController.getChatHistory);

// Get user's chats
// router.get('/user/:userId', chatController.getUserChats);



module.exports = router; 