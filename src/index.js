require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const { createServer } = require('http');
const { Server } = require('socket.io');
const setupChatSocket = require('./sockets/chat.socket');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const mediaRoutes = require('./routes/media.routes');
const chatRoutes = require('./routes/chat.routes');
const walletRoutes = require('./routes/wallet.routes');
const matchRoutes = require('./routes/match.routes');
const streamRoutes = require('./routes/stream.routes');
const moderationRoutes = require('./routes/moderation.routes');
const { authMiddleware } = require('./middleware/auth.middleware');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 6 // Maximum 6 files (5 photos + 1 audio)
    }
});

// Use Multer for multipart/form-data with specific fields
app.use((req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
});

// Routes
app.use('/auth', authRoutes);

// app.use(authMiddleware);

app.use('/users', userRoutes);
app.use('/chats', chatRoutes);
app.use('/matches', matchRoutes);

// app.use('/media', mediaRoutes);
app.use('/wallet', walletRoutes);
// app.use('/streams', streamRoutes);
// app.use('/moderation', moderationRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowEIO3: true
});
setupChatSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});