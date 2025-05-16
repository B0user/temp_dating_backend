const express = require('express');
const router = express.Router();
// const Stream = require('../models/stream.model');
// const { z } = require('zod');
const streamController = require('../controllers/stream.controller');

// // Validation schemas
// const createStreamSchema = z.object({
//   title: z.string().min(1).max(100),
//   description: z.string().max(500).optional(),
//   isPrivate: z.boolean().optional(),
//   allowedUsers: z.array(z.string()).optional()
// });

// // Create a new stream
// router.post('/', async (req, res) => {
//   try {
//     const validatedData = createStreamSchema.parse(req.body);
    
//     const stream = new Stream({
//       host: req.user.id,
//       ...validatedData
//     });

//     await stream.save();
//     res.status(201).json(stream);
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return res.status(400).json({ error: error.errors });
//     }
//     res.status(500).json({ error: error.message });
//   }
// });

// Get active streams
router.get('/', streamController.getStreamerIds);

// // Get stream by ID
// router.get('/:streamId', async (req, res) => {
//   try {
//     const stream = await Stream.findById(req.params.streamId)
//       .populate('host', 'username profilePhoto')
//       .populate('viewers.user', 'username profilePhoto');

//     if (!stream) {
//       return res.status(404).json({ error: 'Stream not found' });
//     }

//     res.json(stream);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // End a stream
// router.post('/:streamId/end', async (req, res) => {
//   try {
//     const stream = await Stream.findById(req.params.streamId);

//     if (!stream) {
//       return res.status(404).json({ error: 'Stream not found' });
//     }

//     if (stream.host.toString() !== req.user.id) {
//       return res.status(403).json({ error: 'Only the host can end the stream' });
//     }

//     stream.status = 'ended';
//     stream.endedAt = new Date();
//     await stream.save();

//     res.json({ message: 'Stream ended successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get user's stream history
// router.get('/user/history', async (req, res) => {
//   try {
//     const { page = 1, limit = 20 } = req.query;
//     const skip = (page - 1) * limit;

//     const streams = await Stream.find({
//       $or: [
//         { host: req.user.id },
//         { 'viewers.user': req.user.id }
//       ],
//       status: 'ended'
//     })
//       .populate('host', 'username profilePhoto')
//       .skip(skip)
//       .limit(parseInt(limit))
//       .sort({ endedAt: -1 });

//     const total = await Stream.countDocuments({
//       $or: [
//         { host: req.user.id },
//         { 'viewers.user': req.user.id }
//       ],
//       status: 'ended'
//     });

//     res.json({
//       streams,
//       total,
//       pages: Math.ceil(total / limit)
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router; 