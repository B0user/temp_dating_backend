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
  async createChat(matchId, participants) {
    try {
      const chat = await Chat.create({
        match: matchId,
        participants,
        messages: [],
        isActive: true
      });

      return chat;
    } catch (error) {
      throw new Error('Error creating chat');
    }
  }

  async sendMessage(chatId, senderId, messageData) {
    try {
      const validatedData = messageSchema.parse(messageData);
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.participants.includes(senderId)) {
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

      return message;
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

  async getChatHistory(chatId, userId, page = 1, limit = 50) {
    try {
      const chat = await Chat.findById(chatId)
        .populate('participants', 'username profilePhotos')
        .populate('messages.sender', 'username profilePhotos');

      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.participants.some(p => p._id.equals(userId))) {
        throw new Error('User not in chat');
      }

      const startIndex = (page - 1) * limit;
      const messages = chat.messages.slice(startIndex, startIndex + limit);

      return {
        chat,
        messages,
        page,
        totalPages: Math.ceil(chat.messages.length / limit)
      };
    } catch (error) {
      throw new Error('Error fetching chat history');
    }
  }

  async getUserChats(userId, page = 1, limit = 20) {
    try {
      console.log('Starting getUserChats with userId:', userId);
      
      const chats = await Chat.find({
        'participants.userId': userId,
        isActive: true
      })
        .populate('lastMessage.sender', 'username')
        .sort({ 'lastMessage.createdAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      console.log('Found populated chats:', chats);

      // Process the chats to ensure we have the correct photo URLs
      const processedChats = chats.map(chat => {
        // Find the other participant
        const otherParticipant = chat.participants.find(p => !p.userId.equals(userId));
        
        return {
          ...chat.toObject(),
          otherParticipant: otherParticipant || null
        };
      });

      const total = await Chat.countDocuments({
        'participants.userId': userId,
        isActive: true
      });

      return {
        chats: processedChats,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error in getUserChats:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Error fetching user chats: ${error.message}`);
    }
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
}

module.exports = new ChatService(); 