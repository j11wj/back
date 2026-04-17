import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private isRedisAvailable = false;
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    const redisOptions: any = {
      host: redisHost,
      port: redisPort,
      retryStrategy: (times: number) => {
        // Stop retrying after MAX_CONNECTION_ATTEMPTS
        if (times > this.MAX_CONNECTION_ATTEMPTS) {
          this.logger.warn('Redis connection retry limit reached. Stopping retry attempts.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null, // Disable automatic retries on requests
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when offline
      connectTimeout: 5000, // 5 seconds timeout
      enableReadyCheck: true,
    };

    if (redisPassword) {
      redisOptions.password = redisPassword;
    }

    try {
      // Create separate connections for pub/sub and regular operations
      this.client = new Redis(redisOptions);
      this.subscriber = new Redis(redisOptions);
      this.publisher = new Redis(redisOptions);

      // Event handlers with connection state tracking
      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isRedisAvailable = true;
        this.connectionAttempts = 0;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
        this.isRedisAvailable = true;
      });

      this.client.on('error', (error) => {
        // Only log error once per connection attempt to reduce noise
        if (this.connectionAttempts === 0 || error.message.includes('ECONNREFUSED')) {
          // Suppress repeated connection refused errors
          if (!this.isRedisAvailable) {
            // Already logged, don't spam
            return;
          }
        }
        this.isRedisAvailable = false;
      });

      this.client.on('close', () => {
        this.logger.debug('Redis client connection closed');
        this.isRedisAvailable = false;
      });

      this.subscriber.on('connect', () => {
        this.logger.log('Redis subscriber connected');
      });

      this.subscriber.on('ready', () => {
        this.logger.log('Redis subscriber ready');
      });

      this.subscriber.on('error', (error) => {
        // Suppress repeated connection errors
        if (this.isRedisAvailable && error.message.includes('ECONNREFUSED')) {
          return;
        }
      });

      this.subscriber.on('close', () => {
        this.logger.debug('Redis subscriber connection closed');
      });

      this.publisher.on('connect', () => {
        this.logger.log('Redis publisher connected');
      });

      this.publisher.on('ready', () => {
        this.logger.log('Redis publisher ready');
      });

      this.publisher.on('error', (error) => {
        // Suppress repeated connection errors
        if (this.isRedisAvailable && error.message.includes('ECONNREFUSED')) {
          return;
        }
      });

      this.publisher.on('close', () => {
        this.logger.debug('Redis publisher connection closed');
      });

      // Attempt to connect with timeout
      try {
        await Promise.race([
          Promise.all([
            this.client.connect().catch((err) => {
              this.connectionAttempts++;
              if (this.connectionAttempts <= this.MAX_CONNECTION_ATTEMPTS) {
                this.logger.warn(`Redis client connection failed: ${err.message}. Continuing without Redis...`);
              }
            }),
            this.subscriber.connect().catch((err) => {
              // Suppress error logging after first attempt
            }),
            this.publisher.connect().catch((err) => {
              // Suppress error logging after first attempt
            }),
          ]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          ),
        ]);
      } catch (error) {
        // Connection timeout or failure
        this.isRedisAvailable = false;
        this.logger.warn('Redis connection failed or timed out. Application will continue in single-server mode.');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`, error.stack);
      this.logger.warn('Application will continue without Redis (single server mode)');
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      this.logger.log('Redis connections closed');
    } catch (error) {
      this.logger.error(`Error closing Redis connections: ${error.message}`);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable && !!this.client && !!this.subscriber && !!this.publisher;
  }

  /**
   * Get Redis client for regular operations
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Get Redis subscriber for pub/sub
   */
  getSubscriber(): Redis {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized');
    }
    return this.subscriber;
  }

  /**
   * Get Redis publisher for pub/sub
   */
  getPublisher(): Redis {
    if (!this.publisher) {
      throw new Error('Redis publisher not initialized');
    }
    return this.publisher;
  }

  /**
   * Set a key-value pair with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable() || !this.client) {
      return; // Silently fail if Redis is not available
    }
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      // Silently handle errors when Redis is unavailable
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable() || !this.client) {
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set TTL for a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isAvailable() || !this.client) {
      return;
    }
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<void> {
    if (!this.isAvailable() || !this.publisher) {
      return;
    }
    try {
      await this.publisher.publish(channel, message);
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.isAvailable() || !this.subscriber) {
      return;
    }
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(msg);
        }
      });
    } catch (error) {
      // Silently handle errors
    }
  }
}

