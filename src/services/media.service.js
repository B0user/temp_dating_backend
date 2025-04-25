const { uploadToS3, generatePresignedUrl, deleteFromS3, generateMediaKey } = require('../utils/s3');
const logger = require('../utils/logger');

const mediaService = {
  async validateUpload(file, type) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedAudioTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (type === 'image' && !allowedImageTypes.includes(file.mimetype)) {
      throw new Error('Invalid image type. Only JPEG, PNG, and JPG are allowed');
    }

    if (type === 'audio' && !allowedAudioTypes.includes(file.mimetype)) {
      throw new Error('Invalid audio type. Only MP3 and WAV are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB');
    }

    return true;
  },

  async uploadFile(file, userId, type) {
    try {
      await this.validateUpload(file, type);
      
      const key = generateMediaKey(userId, type, file.originalname);
      const url = await uploadToS3(file, key);
      
      return {
        key,
        url
      };
    } catch (error) {
      logger.error(`Error uploading ${type}:`, error);
      throw error;
    }
  },

  async uploadPhotos(files, userId) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file, userId, 'photos')
      );
      
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      logger.error('Error uploading photos:', error);
      throw error;
    }
  },

  async uploadAudio(file, userId) {
    try {
      const result = await this.uploadFile(file, userId, 'audio');
      return result;
    } catch (error) {
      logger.error('Error uploading audio:', error);
      throw error;
    }
  },

  async deleteFile(key) {
    try {
      await deleteFromS3(key);
      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  },

  async getSignedUrl(key) {
    try {
      return await generatePresignedUrl(key);
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }
};

module.exports = mediaService; 