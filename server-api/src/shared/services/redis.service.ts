import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { isRedisConfigured } from 'src/shared/utils/env.utils';

export interface JobStatusData {
  status: string;
  progress?: number;
  message?: string;
  result?: string;
  error?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  retries?: number;
  metadata?: any;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client?: Redis;
  private readonly logger = new Logger(RedisService.name);
  private connectionRetries = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 1000;
  private readonly isEnabled = isRedisConfigured();

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn('REDIS_HOST/REDIS_PORT missing or placeholder. Redis disabled for local dev.');
      return;
    }
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        connectTimeout: 10000,
        lazyConnect: true,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully');
        this.connectionRetries = 0;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis connection ready');
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis connection error: ${err.message}`, err.stack);
        if (this.connectionRetries < this.maxRetries) {
          this.scheduleReconnect();
        }
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        if (this.connectionRetries < this.maxRetries) {
          this.scheduleReconnect();
        }
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: ${error.message}`,
        error.stack,
      );
      if (this.connectionRetries < this.maxRetries) {
        this.scheduleReconnect();
      } else {
        throw new Error(
          `Failed to connect to Redis after ${this.maxRetries} attempts`,
        );
      }
    }
  }

  private scheduleReconnect() {
    this.connectionRetries++;
    setTimeout(() => {
      this.logger.log(
        `Attempting Redis reconnection (${this.connectionRetries}/${this.maxRetries})`,
      );
      this.connectWithRetry();
    }, this.retryDelay * this.connectionRetries);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Redis connection closed');
    }
  }

  private ensureClient(): Redis | null {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    return this.client;
  }

  async setJobStatus(
    jobId: string,
    progress: number,
    status: string,
    message?: string,
  ): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job:${jobId}:metadata`;
      const timestamp = new Date().toISOString();
      const updateData: Partial<JobStatusData> = {
        status,
        ...(status === 'waiting' && { createdAt: timestamp }),
        ...(status === 'process' && { startedAt: timestamp }),
        ...(status === 'completed' && { completedAt: timestamp }),
        ...(status === 'failed' && { completedAt: timestamp }),
        progress: progress,
        ...(message && { message }),
      };

      await (client as any).hset(key, updateData);
      await (client as any).expire(key, 3600);

      this.logger.debug(`Job ${jobId} progress updated to: ${progress}%`);
    } catch (error) {
      this.logger.error(
        `Failed to set job progress for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async setJobError(jobId: string, error: any): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job:${jobId}:metadata`;
      const errorData = {
        status: 'failed',
        error: JSON.stringify({
          message: error.message || String(error),
          code: error.code,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }),
        completedAt: new Date().toISOString(),
      };

      await (client as any).hset(key, errorData);
      await (client as any).expire(key, 3600);

      this.logger.error(`Job ${jobId} error recorded: ${error.message}`);
    } catch (redisError) {
      this.logger.error(
        `Failed to set job error for ${jobId}: ${redisError.message}`,
        redisError.stack,
      );
      throw redisError;
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatusData | null> {
    try {
      const client = this.ensureClient();
      if (!client) return null;
      const key = `job:${jobId}:metadata`;
      const data = await (client as any).hgetall(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const result = data as JobStatusData;
      result.metadata = data.metadata ? JSON.parse(data.metadata) : {};
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get job status for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async incrementJobRetries(jobId: string): Promise<number> {
    try {
      const client = this.ensureClient();
      if (!client) return 0;
      const key = `job:${jobId}:metadata`;
      const retries = await (client as any).hincrby(key, 'retries', 1);
      await (client as any).expire(key, 3600);

      this.logger.debug(`Job ${jobId} retry count: ${retries}`);
      return retries;
    } catch (error) {
      this.logger.error(
        `Failed to increment retries for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async setJobMetadata(jobId: string, metadata: any): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job:${jobId}:metadata`;
      await (client as any).hset(
        key,
        'metadata',
        JSON.stringify(metadata),
      );
      await (client as any).expire(key, 3600);

      this.logger.debug(`Job ${jobId} metadata updated`);
    } catch (error) {
      this.logger.error(
        `Failed to set job metadata for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async setJobResult(jobId: string, result: any): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job:${jobId}:metadata`;
      await (client as any).hset(
        key,
        'result',
        JSON.stringify(result),
      );
      await (client as any).expire(key, 3600);
      this.logger.debug(`Job ${jobId} result updated`);
    } catch (error) {
      this.logger.error(
        `Failed to set job result for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteJobStatus(jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job:${jobId}:metadata`;
      await (client as any).del(key);

      this.logger.debug(`Job ${jobId} status deleted`);
    } catch (error) {
      this.logger.error(
        `Failed to delete job status for ${jobId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserJobIds(userId: string): Promise<string[]> {
    try {
      const client = this.ensureClient();
      if (!client) return [];
      const key = `user:${userId}:jobs`;
      const jobIds = await (client as any).lrange(key, 0, -1);
      return jobIds;
    } catch (error) {
      this.logger.error(
        `Failed to get user jobs for ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addUserJob(userId: string, jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `user:${userId}:jobs`;
      await (client as any).lpush(key, jobId);
      await (client as any).ltrim(key, 0, 99); // Keep only last 100 jobs
      await (client as any).expire(key, 86400); // TTL 24 hours

      this.logger.debug(`Job ${jobId} added to user ${userId} job list`);
    } catch (error) {
      this.logger.error(
        `Failed to add user job for ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = this.ensureClient();
      if (!client) return false;
      const result = await (client as any).ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }

  // Generic caching methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.ensureClient();
      if (!client) return null;
      const result = await (client as any).get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}: ${error.message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      await (client as any).setex(key, ttlSeconds, JSON.stringify(value));
      this.logger.debug(`Cache key ${key} set with TTL ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}: ${error.message}`);
      // Don't throw error to prevent cache failures from breaking the application
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      await (client as any).del(key);
      this.logger.debug(`Cache key ${key} deleted`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}: ${error.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = this.ensureClient();
      if (!client) return false;
      const result = await (client as any).exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check existence of cache key ${key}: ${error.message}`,
      );
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = this.ensureClient();
      if (!client) return new Array(keys.length).fill(null);
      const results = await (client as any).mget(keys);
      return results.map((result: string | null) =>
        result ? JSON.parse(result) : null,
      );
    } catch (error) {
      this.logger.error(`Failed to get multiple cache keys: ${error.message}`);
      return new Array(keys.length).fill(null);
    }
  }

  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      // Use pipeline for better performance
      const pipeline = (client as any).pipeline();

      keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      this.logger.debug(`Set ${keyValuePairs.length} cache keys in batch`);
    } catch (error) {
      this.logger.error(`Failed to set multiple cache keys: ${error.message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const keys = await (client as any).keys(pattern);
      if (keys.length > 0) {
        await (client as any).del(...keys);
        this.logger.debug(
          `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache pattern ${pattern}: ${error.message}`,
      );
    }
  }

  async getConnectionInfo(): Promise<any> {
    try {
      const client = this.ensureClient();
      if (!client) {
        return { connected: false, status: 'disabled' };
      }
      const info = await (client as any).info();
      return {
        connected: client.status === 'ready',
        status: client.status,
        info: info,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get Redis connection info: ${error.message}`,
      );
      return {
        connected: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  async deleteUserJob(userId: string, jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `user:${userId}:jobs`;
      await client.lrem(key, 1, jobId);
      this.logger.debug(`Removed job ${jobId} from user ${userId} job list`);
    } catch (error) {
      this.logger.error(
        `Failed to remove job from user list: ${error.message}`,
      );
    }
  }

  /**
   * Comprehensive cleanup for a completed job
   * Removes all Redis entries related to the job
   */
  async cleanupCompletedJob(jobId: string, userId?: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const cleanupPromises: Promise<void>[] = [];

      // Clean up job metadata
      cleanupPromises.push(this.deleteJobStatus(jobId));

      // Clean up user job list if userId provided
      if (userId) {
        cleanupPromises.push(this.deleteUserJob(userId, jobId));
      }

      // Execute all cleanup operations in parallel
      await Promise.allSettled(cleanupPromises);

      this.logger.debug(`Completed cleanup for job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup job ${jobId}: ${error.message}`);
    }
  }
}
