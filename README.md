# Dating Platform Backend

A Node.js backend for a dating platform with features like user authentication, profile management, chat, matches, live streaming, and more.

## Features

- Telegram-based authentication
- User profile management
- Media upload to AWS S3
- Real-time chat using Socket.io
- Matchmaking system
- Live streaming and video chat roulette
- Wallet and payment system
- User verification and moderation

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+
- AWS S3 bucket
- Stripe account
- Telegram account

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/dating_app

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Redis
REDIS_URL=redis://localhost:6379
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dating-backend.git
cd dating-backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## API Documentation

### Authentication

#### Telegram Login
```http
POST /api/auth/telegram
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

### User Management

#### Register User
```http
POST /api/auth/register
```
Request body:
```json
{
  "telegramId": "string",
  "name": "string",
  "gender": "string",
  "wantToFind": "string",
  "birthDay": "string",
  "country": "string",
  "city": "string",
  "latitude": "number",
  "longitude": "number",
  "purpose": "string",
  "interests": "string",
  "photos": ["string"],
  "audioMessage": "string"
}
```

#### Login User
```http
POST /api/auth/login
```
Request body:
```json
{
  "telegramId": "string"
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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 