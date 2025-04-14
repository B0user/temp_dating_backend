const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis Client Ready');
    });
  }

  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  async sadd(key, ...members) {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      logger.error('Redis sadd error:', error);
      return 0;
    }
  }

  async srem(key, ...members) {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      logger.error('Redis srem error:', error);
      return 0;
    }
  }

  async smembers(key) {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Redis smembers error:', error);
      return [];
    }
  }

  async publish(channel, message) {
    try {
      return await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Redis publish error:', error);
      return 0;
    }
  }

  async subscribe(channel, callback) {
    try {
      const subscriber = new Redis(process.env.REDIS_URL);
      await subscriber.subscribe(channel);
      subscriber.on('message', (ch, message) => {
        callback(JSON.parse(message));
      });
      return subscriber;
    } catch (error) {
      logger.error('Redis subscribe error:', error);
      return null;
    }
  }
}

module.exports = new RedisClient(); 