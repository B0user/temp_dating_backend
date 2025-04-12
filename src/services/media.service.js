const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { z } = require('zod');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Validation schemas
const imageUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().regex(/^image\//),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
  bucket: z.string(),
  key: z.string(),
  location: z.string().url(),
  etag: z.string()
});

const audioUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().regex(/^audio\//),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  bucket: z.string(),
  key: z.string(),
  location: z.string().url(),
  etag: z.string()
});

class MediaService {
  constructor() {
    this.upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}/${uniqueSuffix}-${file.originalname}`);
        }
      }),
      fileFilter: this.fileFilter
    });
  }

  fileFilter(req, file, cb) {
    // Accept images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and audio files are allowed.'));
    }
  }

  async validateUpload(file, type) {
    try {
      if (type === 'image') {
        return imageUploadSchema.parse(file);
      } else if (type === 'audio') {
        return audioUploadSchema.parse(file);
      }
      throw new Error('Invalid file type');
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid file upload');
      }
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }).promise();
    } catch (error) {
      throw new Error('Error deleting file from S3');
    }
  }

  getUploadMiddleware(fieldName) {
    return this.upload.single(fieldName);
  }

  getMultiUploadMiddleware(fieldName, maxCount) {
    return this.upload.array(fieldName, maxCount);
  }
}

module.exports = new MediaService(); 