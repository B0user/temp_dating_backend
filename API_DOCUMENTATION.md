# Dating Platform API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Telegram Login
```http
POST /auth/telegram
```
Request body:
```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "username": "string",
  "auth_date": "number",
  "hash": "string"
}
```
Response:
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "profilePhoto": "string",
    "isVerified": "boolean"
  }
}
```

### User Management

#### Get User Profile
```http
GET /users/profile
```
Response:
```json
{
  "id": "string",
  "username": "string",
  "bio": "string",
  "profilePhoto": "string",
  "interests": ["string"],
  "location": {
    "type": "Point",
    "coordinates": [number, number]
  },
  "preferences": {
    "ageRange": {
      "min": "number",
      "max": "number"
    },
    "distance": "number",
    "gender": "string"
  },
  "isVerified": "boolean"
}
```

#### Update User Profile
```http
PUT /users/profile
```
Request body:
```json
{
  "username": "string",
  "bio": "string",
  "interests": ["string"],
  "location": {
    "type": "Point",
    "coordinates": [number, number]
  },
  "preferences": {
    "ageRange": {
      "min": "number",
      "max": "number"
    },
    "distance": "number",
    "gender": "string"
  }
}
```

### Media Upload

#### Upload Profile Photo
```http
POST /media/profile-photo
Content-Type: multipart/form-data
```
Form data:
- `photo`: File (image)

Response:
```json
{
  "url": "string"
}
```

#### Upload Verification Photo
```http
POST /media/verification
Content-Type: multipart/form-data
```
Form data:
- `photo`: File (image)

Response:
```json
{
  "url": "string"
}
```

### Chat

#### Get User's Chats
```http
GET /chat?page=number&limit=number
```
Response:
```json
{
  "chats": [
    {
      "id": "string",
      "participants": [
        {
          "id": "string",
          "username": "string",
          "profilePhoto": "string"
        }
      ],
      "lastMessage": {
        "content": "string",
        "createdAt": "string"
      },
      "unreadCount": "number"
    }
  ],
  "total": "number",
  "pages": "number"
}
```

#### Send Message
```http
POST /chat/:chatId/messages
```
Request body:
```json
{
  "content": "string",
  "media": {
    "type": "string",
    "url": "string"
  }
}
```

### Matches

#### Get Potential Matches
```http
GET /matches/potential?page=number&limit=number
```
Response:
```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "profilePhoto": "string",
      "bio": "string",
      "distance": "number"
    }
  ],
  "total": "number",
  "pages": "number"
}
```

#### Like/Dislike User
```http
POST /matches/:targetUserId
```
Request body:
```json
{
  "like": "boolean"
}
```

### Wallet

#### Create Payment Intent
```http
POST /wallet/payment-intent
```
Request body:
```json
{
  "amount": "number",
  "currency": "string",
  "description": "string"
}
```
Response:
```json
{
  "clientSecret": "string"
}
```

#### Get Transactions
```http
GET /wallet/transactions?page=number&limit=number
```
Response:
```json
{
  "transactions": [
    {
      "id": "string",
      "amount": "number",
      "type": "string",
      "status": "string",
      "createdAt": "string"
    }
  ],
  "total": "number",
  "pages": "number"
}
```

### Streams

#### Create Stream
```http
POST /streams
```
Request body:
```json
{
  "title": "string",
  "description": "string",
  "isPrivate": "boolean",
  "allowedUsers": ["string"]
}
```
Response:
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "host": {
    "id": "string",
    "username": "string",
    "profilePhoto": "string"
  },
  "status": "string",
  "createdAt": "string"
}
```

#### Get Active Streams
```http
GET /streams?page=number&limit=number
```
Response:
```json
{
  "streams": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "host": {
        "id": "string",
        "username": "string",
        "profilePhoto": "string"
      },
      "viewerCount": "number",
      "status": "string"
    }
  ],
  "total": "number",
  "pages": "number"
}
```

#### End Stream
```http
POST /streams/:streamId/end
```
Response:
```json
{
  "message": "string"
}
```

## WebSocket Events

### Chat Namespace (`/chat`)

#### Join Chats
```javascript
socket.emit('join-chats', ['chatId1', 'chatId2']);
```

#### Send Message
```javascript
socket.emit('send-message', {
  chatId: 'string',
  content: 'string',
  media: {
    type: 'string',
    url: 'string'
  }
});
```

#### Receive Message
```javascript
socket.on('new-message', (message) => {
  // Handle new message
});
```

### Stream Namespace (`/stream`)

#### Start Stream
```javascript
socket.emit('start-stream', {
  title: 'string',
  description: 'string'
});
```

#### Join Stream
```javascript
socket.emit('join-stream', {
  streamId: 'string'
});
```

#### Leave Stream
```javascript
socket.emit('leave-stream', {
  streamId: 'string'
});
```

#### Join Roulette
```javascript
socket.emit('join-roulette');
```

#### Skip Roulette
```javascript
socket.emit('skip-roulette');
```

## Error Responses

All endpoints may return the following error responses:

```json
{
  "error": "string"
}
```

Common status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Pagination

Many endpoints support pagination using query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

## Rate Limiting

The API is rate-limited to 100 requests per 15 minutes per IP address. 