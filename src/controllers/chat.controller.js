const chatService = require('../services/chat.service');

exports.getUserChats = async (req, res) => {
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
};

exports.getChatHistory = async (req, res) => {
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
};

exports.sendMessage = async (req, res) => {
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
};

exports.markAsRead = async (req, res) => {
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
};

exports.updateTypingStatus = async (req, res) => {
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
};
