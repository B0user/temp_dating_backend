# Chat System Documentation

## Overview
This documentation describes how to integrate with the real-time chat system using both REST API endpoints and WebSocket connections. The system uses Socket.IO for real-time communication and MongoDB for data persistence.

## Base URLs
- REST API: `http://localhost:3001/chats`
- WebSocket: `ws://localhost:3001`

## Authentication
All requests require authentication. Include the user's token in the request headers:
```javascript
headers: {
    'Authorization': `Bearer ${token}`
}
```

## REST API Endpoints

### 1. Get User's Chats
Retrieve all chats for a specific user.

**Endpoint:** `GET /user/:userId`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Response:**
```javascript
{
    "status": "success",
    "data": [
        {
            "_id": "chatId",
            "participants": [
                {
                    "userId": "userId",
                    "username": "username",
                    "photos": ["photoUrl"]
                }
            ],
            "lastMessage": {
                "sender": "userId",
                "content": "message content",
                "createdAt": "timestamp"
            }
        }
    ]
}
```

### 2. Get Chat History
Retrieve messages from a specific chat.

**Endpoint:** `GET /:chatId/history`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 50)

**Response:**
```javascript
{
    "status": "success",
    "data": [
        {
            "_id": "messageId",
            "sender": "userId",
            "content": "message content",
            "createdAt": "timestamp",
            "readBy": ["userId"]
        }
    ]
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001', {
    auth: {
        token: 'userToken'
    }
});
```

### Events

#### 1. Join Chat Room
```javascript
socket.emit('join-chat', chatId);
```

#### 2. Send Message
```javascript
socket.emit('send-message', {
    chatId: 'chatId',
    senderId: 'userId',
    content: 'message content'
});
```

#### 3. Mark Messages as Read
```javascript
socket.emit('mark-read', {
    chatId: 'chatId',
    userId: 'userId'
});
```

### Listeners

#### 1. New Message
```javascript
socket.on('new-message', (message) => {
    // Handle new message
    console.log('New message:', message);
});
```

#### 2. Messages Read
```javascript
socket.on('messages-read', (data) => {
    // Handle read status update
    console.log('Messages read:', data);
});
```

#### 3. Error
```javascript
socket.on('error', (error) => {
    // Handle error
    console.error('Socket error:', error);
});
```

## Data Model

### Chat
```javascript
{
    participants: [{
        userId: ObjectId,
        username: String,
        photos: [String],
        // ... other user details
    }],
    messages: [{
        sender: ObjectId,
        content: String,
        readBy: [ObjectId],
        createdAt: Date
    }],
    lastMessage: {
        sender: ObjectId,
        content: String,
        createdAt: Date
    }
}
```

## Example Implementation

```javascript
import { io } from 'socket.io-client';

class ChatService {
    constructor() {
        this.socket = null;
    }

    connect(token) {
        this.socket = io('http://localhost:3001', {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to chat server');
        });

        this.socket.on('new-message', this.handleNewMessage);
        this.socket.on('messages-read', this.handleMessagesRead);
    }

    joinChat(chatId) {
        this.socket.emit('join-chat', chatId);
    }

    sendMessage(chatId, content) {
        const userId = localStorage.getItem('userId');
        this.socket.emit('send-message', {
            chatId,
            senderId: userId,
            content
        });
    }

    markAsRead(chatId) {
        const userId = localStorage.getItem('userId');
        this.socket.emit('mark-read', {
            chatId,
            userId
        });
    }

    handleNewMessage(message) {
        // Update UI with new message
    }

    handleMessagesRead(data) {
        // Update message read status in UI
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
```

## Error Handling

### REST API Errors
All API endpoints return errors in the following format:
```javascript
{
    "status": "error",
    "message": "Error message"
}
```

### WebSocket Errors
Socket errors are emitted through the 'error' event:
```javascript
socket.on('error', (error) => {
    console.error('Socket error:', error);
});
```

## Best Practices

1. **Connection Management**
   - Connect to WebSocket when the chat component mounts
   - Disconnect when the component unmounts
   - Implement reconnection logic

2. **Message Handling**
   - Store messages in local state
   - Update UI immediately for optimistic updates
   - Handle errors gracefully

3. **Performance**
   - Implement pagination for chat history
   - Use message batching for bulk updates
   - Implement proper cleanup on component unmount

4. **Security**
   - Always include authentication token
   - Validate user permissions
   - Sanitize message content

## Troubleshooting

1. **Connection Issues**
   - Check if the server is running on port 3001
   - Verify the WebSocket URL
   - Check authentication token

2. **Message Not Sending**
   - Verify socket connection status
   - Check message format
   - Verify user permissions

3. **Messages Not Receiving**
   - Check if joined the correct chat room
   - Verify event listeners
   - Check network connectivity 