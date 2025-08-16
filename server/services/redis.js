import { Redis } from '@upstash/redis';

class RedisService {
  constructor() {
    // Configure Redis connection with fallback to in-memory for development
    this.redis = null;
    this.isConnected = false;
    this.cache = new Map(); // Fallback in-memory cache
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      // Try connecting to Upstash Redis
      if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_URL,
          token: process.env.UPSTASH_REDIS_TOKEN,
        });
        
        // Test the connection
        await this.redis.ping();
        this.isConnected = true;
        console.log('✅ Upstash Redis connected successfully');
      } else {
        console.log('⚠️  Upstash Redis credentials not provided, using in-memory fallback');
        this.isConnected = false;
      }
    } catch (error) {
      console.warn('⚠️  Upstash Redis connection failed, using in-memory fallback:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.get(key);
      }
      return this.cache.get(key);
    } catch (error) {
      console.warn('Redis get error:', error.message);
      return this.cache.get(key);
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (this.isConnected && this.redis) {
        if (ttl) {
          await this.redis.setex(key, ttl, value);
        } else {
          await this.redis.set(key, value);
        }
      }
      
      // Always store in fallback cache
      this.cache.set(key, value);
      if (ttl) {
        setTimeout(() => this.cache.delete(key), ttl * 1000);
      }
      return true;
    } catch (error) {
      console.warn('Redis set error:', error.message);
      this.cache.set(key, value);
      if (ttl) {
        setTimeout(() => this.cache.delete(key), ttl * 1000);
      }
      return true;
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.warn('Redis del error:', error.message);
      this.cache.delete(key);
      return true;
    }
  }

  async setLock(key, ttl = 30) {
    try {
      if (this.isConnected && this.redis) {
        // Using SET with NX and EX options for atomic locking
        const result = await this.redis.set(key, '1', {
          nx: true,
          ex: ttl
        });
        return result === 'OK';
      }
      
      // Fallback lock implementation
      if (!this.cache.has(key)) {
        this.cache.set(key, '1');
        setTimeout(() => this.cache.delete(key), ttl * 1000);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Redis lock error:', error.message);
      return false;
    }
  }

  async releaseLock(key) {
    try {
      if (this.isConnected && this.redis) {
        // Using a simple Lua script to atomically delete the key only if it exists
        await this.redis.del(key);
      }
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.warn('Redis unlock error:', error.message);
      this.cache.delete(key);
      return true;
    }
  }

  async getAuctionState(auctionId) {
    const state = await this.get(`auction:${auctionId}`);
    return state ? JSON.parse(state) : null;
  }

  async setAuctionState(auctionId, state, ttl = 3600) {
    return await this.set(`auction:${auctionId}`, JSON.stringify(state), ttl);
  }

  async addParticipant(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    try {
      if (this.isConnected && this.redis) {
        await this.redis.sadd(key, userId);
      } else {
        const participants = this.cache.get(key) || new Set();
        participants.add(userId);
        this.cache.set(key, participants);
      }
      return true;
    } catch (error) {
      console.warn('Redis participant error:', error.message);
      return false;
    }
  }

  async getParticipants(auctionId) {
    const key = `auction:${auctionId}:participants`;
    try {
      if (this.isConnected && this.redis) {
        const members = await this.redis.smembers(key);
        return members;
      } else {
        const participants = this.cache.get(key) || new Set();
        return Array.from(participants);
      }
    } catch (error) {
      console.warn('Redis participants error:', error.message);
      return [];
    }
  }

  async getHighestBid(auctionId) {
    const key = `auction:${auctionId}:highestBid`;
    try {
      if (this.isConnected && this.redis) {
        const bidData = await this.redis.get(key);
        return bidData ? JSON.parse(bidData) : null;
      } else {
        return this.cache.get(key) || null;
      }
    } catch (error) {
      console.warn('Redis highest bid error:', error.message);
      return this.cache.get(key) || null;
    }
  }

  async setHighestBid(auctionId, bidData) {
    const key = `auction:${auctionId}:highestBid`;
    try {
      if (this.isConnected && this.redis) {
        await this.redis.set(key, JSON.stringify(bidData));
      }
      this.cache.set(key, bidData);
      return true;
    } catch (error) {
      console.warn('Redis set highest bid error:', error.message);
      this.cache.set(key, bidData);
      return true;
    }
  }

  async getAuctionStatus(auctionId) {
    const key = `auction:${auctionId}:status`;
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.get(key);
      } else {
        return this.cache.get(key) || null;
      }
    } catch (error) {
      console.warn('Redis auction status error:', error.message);
      return this.cache.get(key) || null;
    }
  }

  async setAuctionStatus(auctionId, status) {
    const key = `auction:${auctionId}:status`;
    try {
      if (this.isConnected && this.redis) {
        await this.redis.set(key, status);
      }
      this.cache.set(key, status);
      return true;
    } catch (error) {
      console.warn('Redis set auction status error:', error.message);
      this.cache.set(key, status);
      return true;
    }
  }

  async removeUserFromAuction(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    try {
      if (this.isConnected && this.redis) {
        await this.redis.srem(key, userId);
      } else {
        const participants = this.cache.get(key) || new Set();
        participants.delete(userId);
        this.cache.set(key, participants);
      }
      return true;
    } catch (error) {
      console.warn('Redis remove user error:', error.message);
      return false;
    }
  }

  async acquireLock(auctionId, ttl = 30) {
    const lockKey = `lock:auction:${auctionId}`;
    return await this.setLock(lockKey, ttl);
  }

  async releaseLock(auctionId) {
    const lockKey = `lock:auction:${auctionId}`;
    return await this.releaseLock(lockKey);
  }
}

export const redisService = new RedisService();