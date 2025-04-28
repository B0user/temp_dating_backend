const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('./logger');

// Validate AWS configuration
const validateAWSConfig = () => {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_BUCKET_NAME'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
  }
};

// Initialize S3 client
let s3Client;
try {
  validateAWSConfig();
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
} catch (error) {
  logger.error('Failed to initialize S3 client:', error);
  s3Client = null;
}

/**
 * Uploads a file to S3
 * @param {Object} file - The file object from multer
 * @param {string} key - The S3 key/path for the file
 * @returns {Promise<string>} - The S3 key of the uploaded file
 */
const uploadToS3 = async (file, key) => {
  try {
    if (!s3Client) {
      throw new Error('S3 client not initialized. Check AWS configuration.');
    }

    if (!file || !file.buffer) {
      throw new Error('Invalid file object: missing buffer');
    }

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    console.log("COMMAND TO S3 ",command);

    await s3Client.send(command);
    logger.info(`File uploaded successfully to S3: ${key}`);
    
    // Return the full S3 URL
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    logger.error('Error uploading to S3:', error);
    if (error.name === 'AccessControlListNotSupported') {
      throw new Error('S3 bucket does not support ACLs. Please configure bucket policy instead.');
    }
    throw error;
  }
};

/**
 * Generates a presigned URL for accessing an S3 object
 * @param {string} key - The S3 key/path of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - The presigned URL
 */
const generatePresignedUrl = async (key, expiresIn = 3600) => {
  try {
    if (!s3Client) {
      throw new Error('S3 client not initialized. Check AWS configuration.');
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    // logger.info(`Generated presigned URL for: ${key}`);
    return url;
  } catch (error) {
    logger.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Deletes a file from S3
 * @param {string} key - The S3 key/path of the file to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
const deleteFromS3 = async (key) => {
  try {
    if (!s3Client) {
      throw new Error('S3 client not initialized. Check AWS configuration.');
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`File deleted successfully from S3: ${key}`);
    return true;
  } catch (error) {
    logger.error('Error deleting from S3:', error);
    throw error;
  }
};

/**
 * Generates a unique key for user media files
 * @param {string} userId - The user's ID
 * @param {string} type - The type of media (photo/audio)
 * @param {string|undefined} filename - The original filename (optional)
 * @returns {string} - The generated S3 key
 */
const generateMediaKey = (userId, type, filename) => {
  const timestamp = Date.now();
  const extension = filename ? filename.split('.').pop() : type === 'photos' ? 'jpg' : 'mp3';
  return `users/${userId}/${type}/${timestamp}.${extension}`;
};

module.exports = {
  uploadToS3,
  generatePresignedUrl,
  deleteFromS3,
  generateMediaKey
}; 