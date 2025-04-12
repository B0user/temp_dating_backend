const Stream = require('../models/stream.model');
const authService = require('../services/auth.service');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

function setupStreamSocket(io) {
  const streamNamespace = io.of('/stream');

  streamNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const user = await authService.validateUser(token);
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  streamNamespace.on('connection', (socket) => {
    console.log(`User connected to stream: ${socket.user.username}`);

    // Live Streaming
    socket.on('start-stream', async (data) => {
      try {
        const stream = await Stream.create({
          host: socket.user._id,
          type: 'live',
          title: data.title,
          description: data.description,
          thumbnail: data.thumbnail,
          startedAt: new Date(),
          isPrivate: data.isPrivate || false,
          allowedUsers: data.allowedUsers || [],
          liveStream: {
            streamKey: generateStreamKey(),
            streamUrl: generateStreamUrl()
          }
        });

        socket.join(`stream:${stream._id}`);
        socket.emit('stream-started', {
          streamId: stream._id,
          streamKey: stream.liveStream.streamKey,
          streamUrl: stream.liveStream.streamUrl
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('join-stream', async (data) => {
      try {
        const stream = await Stream.findById(data.streamId);
        if (!stream || stream.status !== 'active') {
          throw new Error('Stream not found or inactive');
        }

        if (stream.isPrivate && !stream.allowedUsers.includes(socket.user._id)) {
          throw new Error('Not authorized to join this stream');
        }

        socket.join(`stream:${stream._id}`);
        stream.viewers.push({
          user: socket.user._id,
          joinedAt: new Date()
        });
        stream.currentViewers += 1;
        stream.maxViewers = Math.max(stream.maxViewers, stream.currentViewers);
        await stream.save();

        streamNamespace.to(`stream:${stream._id}`).emit('viewer-joined', {
          userId: socket.user._id,
          username: socket.user.username,
          currentViewers: stream.currentViewers
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leave-stream', async (data) => {
      try {
        const stream = await Stream.findById(data.streamId);
        if (!stream) return;

        socket.leave(`stream:${stream._id}`);
        const viewerIndex = stream.viewers.findIndex(v => v.user.equals(socket.user._id));
        if (viewerIndex !== -1) {
          stream.viewers[viewerIndex].leftAt = new Date();
          stream.currentViewers -= 1;
          await stream.save();

          streamNamespace.to(`stream:${stream._id}`).emit('viewer-left', {
            userId: socket.user._id,
            username: socket.user.username,
            currentViewers: stream.currentViewers
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('end-stream', async (data) => {
      try {
        const stream = await Stream.findById(data.streamId);
        if (!stream || !stream.host.equals(socket.user._id)) {
          throw new Error('Not authorized to end this stream');
        }

        stream.status = 'ended';
        stream.endedAt = new Date();
        stream.duration = (stream.endedAt - stream.startedAt) / 1000; // Duration in seconds
        await stream.save();

        streamNamespace.to(`stream:${stream._id}`).emit('stream-ended', {
          streamId: stream._id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Video Chat Roulette
    socket.on('join-roulette', async () => {
      try {
        // Add user to roulette queue
        await redis.rpush('roulette:queue', JSON.stringify({
          userId: socket.user._id.toString(),
          socketId: socket.id
        }));

        // Try to match with another user
        await matchRoulettePair(streamNamespace);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('skip-roulette', async () => {
      try {
        // Remove user from current session if any
        const currentSession = await getCurrentRouletteSession(socket.user._id);
        if (currentSession) {
          await endRouletteSession(currentSession, socket.user._id, streamNamespace);
        }

        // Add user back to queue
        await redis.rpush('roulette:queue', JSON.stringify({
          userId: socket.user._id.toString(),
          socketId: socket.id
        }));

        // Try to match with another user
        await matchRoulettePair(streamNamespace);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leave-roulette', async () => {
      try {
        // Remove user from queue
        await removeFromRouletteQueue(socket.user._id);

        // End current session if any
        const currentSession = await getCurrentRouletteSession(socket.user._id);
        if (currentSession) {
          await endRouletteSession(currentSession, socket.user._id, streamNamespace);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // WebRTC Signaling
    socket.on('signal', async (data) => {
      try {
        const { targetUserId, signal } = data;
        const targetSocket = await findUserSocket(targetUserId, streamNamespace);
        if (targetSocket) {
          targetSocket.emit('signal', {
            userId: socket.user._id,
            signal
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        // Handle live stream disconnection
        const activeStream = await Stream.findOne({
          host: socket.user._id,
          status: 'active'
        });

        if (activeStream) {
          activeStream.status = 'ended';
          activeStream.endedAt = new Date();
          activeStream.duration = (activeStream.endedAt - activeStream.startedAt) / 1000;
          await activeStream.save();

          streamNamespace.to(`stream:${activeStream._id}`).emit('stream-ended', {
            streamId: activeStream._id
          });
        }

        // Handle roulette disconnection
        await removeFromRouletteQueue(socket.user._id);
        const currentSession = await getCurrentRouletteSession(socket.user._id);
        if (currentSession) {
          await endRouletteSession(currentSession, socket.user._id, streamNamespace);
        }

        console.log(`User disconnected from stream: ${socket.user.username}`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}

// Helper functions
async function matchRoulettePair(namespace) {
  const queueLength = await redis.llen('roulette:queue');
  if (queueLength < 2) return;

  const user1Data = JSON.parse(await redis.lpop('roulette:queue'));
  const user2Data = JSON.parse(await redis.lpop('roulette:queue'));

  const stream = await Stream.create({
    type: 'roulette',
    status: 'active',
    startedAt: new Date(),
    rouletteSession: {
      participants: [
        { user: user1Data.userId, joinedAt: new Date() },
        { user: user2Data.userId, joinedAt: new Date() }
      ],
      currentPair: [user1Data.userId, user2Data.userId]
    }
  });

  // Store session info in Redis
  await redis.set(`roulette:session:${user1Data.userId}`, stream._id.toString());
  await redis.set(`roulette:session:${user2Data.userId}`, stream._id.toString());

  // Notify both users
  namespace.to(user1Data.socketId).emit('roulette-matched', {
    sessionId: stream._id,
    targetUserId: user2Data.userId
  });

  namespace.to(user2Data.socketId).emit('roulette-matched', {
    sessionId: stream._id,
    targetUserId: user1Data.userId
  });
}

async function getCurrentRouletteSession(userId) {
  const sessionId = await redis.get(`roulette:session:${userId}`);
  if (!sessionId) return null;

  return Stream.findById(sessionId);
}

async function endRouletteSession(session, initiatorId, namespace) {
  const otherUserId = session.rouletteSession.currentPair.find(id => 
    !id.equals(initiatorId)
  );

  // Update session status
  session.status = 'ended';
  session.endedAt = new Date();
  session.duration = (session.endedAt - session.startedAt) / 1000;
  
  const participantIndex = session.rouletteSession.participants.findIndex(p => 
    p.user.equals(initiatorId)
  );
  if (participantIndex !== -1) {
    session.rouletteSession.participants[participantIndex].leftAt = new Date();
    session.rouletteSession.participants[participantIndex].skipped = true;
  }

  await session.save();

  // Clean up Redis
  await redis.del(`roulette:session:${initiatorId}`);
  if (otherUserId) {
    await redis.del(`roulette:session:${otherUserId}`);
  }

  // Notify other user
  const otherUserSocket = await findUserSocket(otherUserId, namespace);
  if (otherUserSocket) {
    otherUserSocket.emit('roulette-ended', {
      sessionId: session._id,
      reason: 'partner_left'
    });
  }
}

async function removeFromRouletteQueue(userId) {
  const queueLength = await redis.llen('roulette:queue');
  for (let i = 0; i < queueLength; i++) {
    const userData = JSON.parse(await redis.lpop('roulette:queue'));
    if (userData.userId !== userId.toString()) {
      await redis.rpush('roulette:queue', JSON.stringify(userData));
    }
  }
}

async function findUserSocket(userId, namespace) {
  const sockets = await namespace.fetchSockets();
  return sockets.find(socket => socket.user._id.equals(userId));
}

function generateStreamKey() {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateStreamUrl() {
  return `rtmp://${process.env.STREAMING_SERVER}/live`;
}

module.exports = setupStreamSocket; 