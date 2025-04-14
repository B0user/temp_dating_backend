const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const mediaService = {
  getUploadMiddleware(fieldName) {
    return upload.single(fieldName);
  },

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

    const fileName = `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(uploadParams), { expiresIn: 3600 });
      return {
        location: signedUrl,
        key: fileName
      };
    } catch (error) {
      throw new Error('Error uploading file to S3');
    }
  },

  async deleteFile(fileUrl) {
    try {
      const key = fileUrl.split('/').pop();
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      };
      await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      throw new Error('Error deleting file from S3');
    }
  }
};

module.exports = mediaService; 