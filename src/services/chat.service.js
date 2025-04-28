const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { z } = require('zod');
const { generatePresignedUrl } = require('../utils/s3');
const logger = require('../utils/logger');
const userService = require('./user.service');

const messageSchema = z.object({
  content: z.string().optional(),
  media: z.object({
    type: z.enum(['image', 'voice', 'video']),
    url: z.string().url(),
    duration: z.number().optional(),
    thumbnail: z.string().url().optional()
  }).optional()
}).refine(data => data.content || data.media, {
  message: "Message must have either content or media"
});

class ChatService {
  // async createChat(matchId, participants) {
  //   try {
  //     const chat = await Chat.create({
  //       match: matchId,
  //       participants,
  //       messages: [],
  //       isActive: true
  //     });

  //     return chat;
  //   } catch (error) {
  //     throw new Error('Error creating chat');
  //   }
  // }

  async sendMessage(chatId, senderId, content) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      // Check if the sender is a participant in the chat
      const isParticipant = chat.participants.some(p => p.userId.toString() === senderId);
      if (!isParticipant) {
        throw new Error('User not in chat');
      }

      const message = {
        sender: senderId,
        content: content,
        readBy: []
      };

      chat.messages.push(message);
      chat.lastMessage = message;
      await chat.save();

      return {
        status: 'success',
        data: {
          message
        }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.participants.includes(userId)) {
        throw new Error('User not in chat');
      }

      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage && !lastMessage.readBy.some(read => read.user.equals(userId))) {
        lastMessage.readBy.push({
          user: userId,
          timestamp: new Date()
        });
        await chat.save();
      }

      return true;
    } catch (error) {
      throw new Error('Error marking messages as read');
    }
  }

  async getChatHistory(chatId, page = 1, limit = 50) {
    try {
      const chat = await Chat.findById(chatId)
        .sort({ 'messages.timestamp': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (!chat) {
        throw new Error('Chat not found');
      }

      // Map through participants to append user info and generate signed URLs
      const chatWithUserInfo = {
        ...chat.toObject(),
        participants: await Promise.all(chat.participants.map(async (participant) => {
          // Fetch user info
          const userInfo = await userService.getUserById(participant.userId);


          return {
            ...participant.toObject(),
            userInfo
          };
        }))
      };

      // Optionally populate messages.sender with minimal user info
      chatWithUserInfo.messages = await Promise.all(chat.messages.map(async (message) => {
        const senderInfo = await userService.getUserById(message.sender);
        return {
          ...message.toObject(),
          sender: {
            userId: message.sender,
            username: senderInfo.username
          }
        };
      }));

      return chatWithUserInfo;

    } catch (error) {
      logger.error('Error fetching chat history:', error);
      throw error;
    }
}

  async getUserChats(userId, page = 1, limit = 20) {
    try {
      const chats = await Chat.find({
        'participants.userId': userId
      }).skip((page - 1) * limit)
      .limit(limit);
      // Map through chats to append user info to participants
      const chatsWithUserInfo = await Promise.all(chats.map(async (chat) => {
        const participantsWithInfo = await Promise.all(chat.participants.map(async (participant) => {
          const userInfo = await userService.getUserById(participant.userId);
          return {
            ...participant.toObject(),
            userInfo
          };
        }));

        return {
          ...chat.toObject(),
          participants: participantsWithInfo
        };
      }));

      return chatsWithUserInfo;
    } catch (error) {
      logger.error('Error fetching user chats:', error);
      throw error;
    }
  }

  calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async updateTypingStatus(chatId, userId, isTyping) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.participants.includes(userId)) {
        throw new Error('User not in chat');
      }

      if (isTyping) {
        const existingTyping = chat.typing.find(t => t.user.equals(userId));
        if (!existingTyping) {
          chat.typing.push({
            user: userId,
            timestamp: new Date()
          });
        }
      } else {
        chat.typing = chat.typing.filter(t => !t.user.equals(userId));
      }

      await chat.save();

      return chat.typing;
    } catch (error) {
      throw new Error('Error updating typing status');
    }
  }

  async saveMessage(chatId, message) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.messages.push(message);
      await chat.save();

      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }
}

module.exports = new ChatService(); 