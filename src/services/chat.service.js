const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { z } = require('zod');

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

  async sendMessage(chatId, senderId, messageData) {
    try {
      const validatedData = messageSchema.parse(messageData);
      
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
        content: validatedData.content,
        media: validatedData.media,
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
      if (error instanceof z.ZodError) {
        throw new Error('Invalid message format');
      }
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
        .populate('messages.sender', 'username photos')
        .sort({ 'messages.timestamp': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (!chat) {
        throw new Error('Chat not found');
      }
      return chat;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }

  async getUserChats(userId, page = 1, limit = 20) {
    try {
      const chats = await Chat.find({
        'participants.userId': userId
      })
      .populate('participants.userId', 'username photos')
      .populate('lastMessage.sender', 'username')
      .sort({ 'lastMessage.createdAt': -1 })
      .skip((page - 1) * limit)
      .limit(limit);

      return chats;
    } catch (error) {
      console.error('Error fetching user chats:', error);
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