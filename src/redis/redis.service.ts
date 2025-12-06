import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from '@redis/client';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private isRedisAvailable: boolean;
  private redisClient: RedisClientType | null;

  constructor(@Inject('REDIS_CLIENT') redisClient: RedisClientType | null) {
    this.redisClient = redisClient;
    this.isRedisAvailable = redisClient !== null;
    if (this.isRedisAvailable) {
      console.log('✅ Redis service initialized successfully');
    } else {
      console.warn('⚠️  Redis service initialized without Redis connection (cache disabled)');
    }
  }

  async onModuleDestroy() {
    if (this.isRedisAvailable && this.redisClient) {
      await this.redisClient.quit();
    }
  }

  /**
   * Получить значение из кэша
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return null;
    }
    try {
      const result = await this.redisClient.get(key);
      if (result) {
        console.log(`📖 Redis CACHE HIT: ${key}`);
        return JSON.parse(result as string);
      } else {
        console.log(`❌ Redis CACHE MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Установить значение в кэш
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return;
    }
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      } else {
        await this.redisClient.set(key, serializedValue);
      }
      console.log(`💾 Redis CACHE SET: ${key} (TTL: ${ttl || 'no expiry'}s)`);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Удалить значение из кэша
   */
  async del(key: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return;
    }
    try {
      await this.redisClient.del(key);
      console.log(`🗑️ Redis CACHE DEL: ${key}`);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  /**
   * Очистить весь кэш
   */
  async reset(): Promise<void> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return;
    }
    try {
      await this.redisClient.flushDb();
      console.log('🧹 Redis CACHE RESET: All data cleared');
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }

  /**
   * Получить ключи по паттерну
   */
  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return [];
    }
    try {
      const keys = await this.redisClient.keys(pattern);
      console.log(`🔍 Redis KEYS: Found ${keys.length} keys for pattern "${pattern}"`);
      return keys;
    } catch (error) {
      console.error('Redis getKeys error:', error);
      return [];
    }
  }

  /**
   * Удалить ключи по паттерну
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getKeys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        console.log(`🗑️ Redis DEL PATTERN: Deleted ${keys.length} keys for pattern "${pattern}"`);
      }
    } catch (error) {
      console.error('Redis delPattern error:', error);
    }
  }

  /**
   * Проверить подключение к Redis
   */
  async ping(): Promise<boolean> {
    if (!this.isRedisAvailable || !this.redisClient) {
      return false;
    }
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }
} 