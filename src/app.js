const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const Redis = require('ioredis');

// Import routes
const authRoutes = require('./routes/auth.routes');
const mediaRoutes = require('./routes/media.routes');
const chatRoutes = require('./routes/chat.routes');
const matchRoutes = require('./routes/match.routes');
const walletRoutes = require('./routes/wallet.routes');
const moderationRoutes = require('./routes/moderation.routes');
const userRoutes = require('./routes/user.routes');
const streamRoutes = require('./routes/stream.routes');

// Import socket handlers
const setupChatSocket = require('./sockets/chat.socket');
const setupStreamSocket = require('./sockets/stream.socket');

const app = express();
const server = http.createServer(app);

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);

// Socket.IO namespaces
const chatNamespace = io.of('/chat');
const streamNamespace = io.of('/stream');

// Setup socket handlers
setupChatSocket(chatNamespace, redis);
setupStreamSocket(streamNamespace, redis);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, io, redis }; 