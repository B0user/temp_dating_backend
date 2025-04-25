// const express = require('express');
// const router = express.Router();
// const mediaService = require('../services/media.service');
// const { authMiddleware } = require('../middleware/auth.middleware');
// const User = require('../models/user.model');

// // Upload profile photo
// router.post('/profile-photo', authMiddleware, mediaService.getUploadMiddleware('photo'), async (req, res) => {
//   try {
//     const file = await mediaService.validateUpload(req.file, 'image');
    
//     const user = await User.findById(req.user._id);
//     user.profilePhotos.push({
//       url: file.location,
//       isVerified: false,
//       order: user.profilePhotos.length
//     });
//     await user.save();

//     res.status(200).json({
//       status: 'success',
//       data: {
//         photo: {
//           url: file.location,
//           order: user.profilePhotos.length - 1
//         }
//       }
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// });

// // Upload verification photo
// router.post('/verification', authMiddleware, mediaService.getUploadMiddleware('photo'), async (req, res) => {
//   try {
//     const file = await mediaService.validateUpload(req.file, 'image');
    
//     const user = await User.findById(req.user._id);
//     user.verificationPhoto = {
//       url: file.location,
//       submittedAt: new Date()
//     };
//     user.verificationStatus = 'pending';
//     await user.save();

//     res.status(200).json({
//       status: 'success',
//       data: {
//         verificationPhoto: {
//           url: file.location,
//           status: 'pending'
//         }
//       }
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// });

// // Upload voice message
// router.post('/voice', authMiddleware, mediaService.getUploadMiddleware('voice'), async (req, res) => {
//   try {
//     const file = await mediaService.validateUpload(req.file, 'audio');
    
//     const user = await User.findById(req.user._id);
//     user.voiceMessage = {
//       url: file.location,
//       duration: req.body.duration || 0
//     };
//     await user.save();

//     res.status(200).json({
//       status: 'success',
//       data: {
//         voiceMessage: {
//           url: file.location,
//           duration: user.voiceMessage.duration
//         }
//       }
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// });

// // Delete profile photo
// router.delete('/profile-photo/:order', authMiddleware, async (req, res) => {
//   try {
//     const order = parseInt(req.params.order);
//     const user = await User.findById(req.user._id);
    
//     if (order >= user.profilePhotos.length) {
//       throw new Error('Invalid photo order');
//     }

//     const photo = user.profilePhotos[order];
//     await mediaService.deleteFile(photo.url);
    
//     user.profilePhotos.splice(order, 1);
//     // Update order for remaining photos
//     user.profilePhotos.forEach((photo, index) => {
//       photo.order = index;
//     });
    
//     await user.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Photo deleted successfully'
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// });

// // Delete voice message
// router.delete('/voice', authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
    
//     if (!user.voiceMessage || !user.voiceMessage.url) {
//       throw new Error('No voice message found');
//     }

//     await mediaService.deleteFile(user.voiceMessage.url);
//     user.voiceMessage = null;
//     await user.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Voice message deleted successfully'
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// });

// module.exports = router; 