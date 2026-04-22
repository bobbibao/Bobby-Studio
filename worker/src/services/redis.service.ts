import { RedisConfig } from '@/config/redis.config';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client?: Redis;
  private readonly logger = new Logger(RedisService.name);
  private connectionRetries = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 1000;

  constructor(private readonly redisConfig: RedisConfig) {
    if (this.redisConfig.isEnabled) {
      this.client = new Redis(this.redisConfig.connectionConfig);
    }
  }
  async onModuleInit() {
    if (!this.redisConfig.isEnabled) {
      this.logger.warn('REDIS_HOST/REDIS_PORT missing or placeholder. Redis disabled for local dev.');
      return;
    }
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    try {
      this.client = new Redis(this.redisConfig.connectionConfig);

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
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
      if (this.connectionRetries < this.maxRetries) {
        this.scheduleReconnect();
      } else {
        throw new Error(`Failed to connect to Redis after ${this.maxRetries} attempts`);
      }
    }
  }

  private scheduleReconnect() {
    this.connectionRetries++;
    setTimeout(() => {
      this.logger.log(`Attempting Redis reconnection (${this.connectionRetries}/${this.maxRetries})`);
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
    if (!this.redisConfig.isEnabled || !this.client) {
      return null;
    }
    return this.client;
  }

  private getWorkerMetadataKey(jobId: string): string {
    return `worker:job:${jobId}:metadata`;
  }

  async deleteJobStatus(jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = this.getWorkerMetadataKey(jobId);
      await client.del(key);

      this.logger.debug(`Job ${jobId} status deleted`);
    } catch (error) {
      this.logger.error(`Failed to delete job status for ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteUserJob(userId: string, jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `user:${userId}:jobs`;

      await client.lrem(key, 1, jobId);

      this.logger.debug(`Deleted job ${jobId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete job ${jobId} for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Batch delete operations using pipeline
  async batchDeleteJobData(jobId: string, userId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const pipeline = client.pipeline();
      // Keep server-api job status keys intact; only clean worker-local Redis keys.
      pipeline.del(this.getWorkerMetadataKey(jobId));
      pipeline.del(`job_result:${jobId}`);

      await pipeline.exec();
      this.logger.debug(`Batch deleted worker-local Redis keys for job ${jobId} (user=${userId})`);
    } catch (error) {
      this.logger.error(`Failed to batch delete job ${jobId}:`, error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = this.ensureClient();
      if (!client) return false;
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{ connected: boolean; status: string; info?: string; error?: string }> {
    try {
      const client = this.ensureClient();
      if (!client) {
        return { connected: false, status: 'disabled' };
      }
      const info = await client.info();
      return {
        connected: client.status === 'ready',
        status: client.status,
        info: info,
      };
    } catch (error) {
      this.logger.error(`Failed to get Redis connection info: ${error.message}`);
      return {
        connected: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      this.logger.debug(`Set cache key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = this.ensureClient();
      if (!client) return null;
      const value = await client.get(key);
      this.logger.debug(`Get cache key: ${key}, found: ${!!value}`);
      return value;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      await client.del(key);
      this.logger.debug(`Deleted cache key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async setJobResult(jobId: string, result: Record<string, unknown>): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job_result:${jobId}`;
      await client.set(key, JSON.stringify(result), 'EX', 3600); // Expire in 1 hour
    } catch (error) {
      this.logger.error(`Failed to set job result: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getJobResult(jobId: string): Promise<Record<string, unknown> | null> {
    try {
      const client = this.ensureClient();
      if (!client) return null;
      const key = `job_result:${jobId}`;
      const result = await client.get(key);
      if (result) {
        return JSON.parse(result);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get job result: ${error.message}`, error.stack);
      throw error;
    }
  }

  async setJobMetadata(jobId: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = this.getWorkerMetadataKey(jobId);
      // Store as hash to match server format
      const hashData = {
        progress: (metadata.progress as string) || '0',
        createdAt: (metadata.createdAt as string) || new Date().toISOString(),
        status: (metadata.status as string) || 'pending',
        metadata: JSON.stringify(metadata), // Store the entire metadata object
      };
      await client.hset(key, hashData);
      await client.expire(key, 3600); // Expire in 1 hour
      this.logger.debug(`Set job metadata for: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to set job metadata: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateJobProgress(jobId: string, progress: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = this.getWorkerMetadataKey(jobId);
      const status = progress === '100' ? 'completed' : 'progress';
      await client.hset(key, {
        progress,
        status,
      });
      this.logger.debug(`Job ${jobId} progress updated to: ${progress}%`);
    } catch (error) {
      this.logger.error(`Failed to update job progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteJobResult(jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = `job_result:${jobId}`;
      await client.del(key);
      this.logger.debug(`Deleted job result: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to delete job result: ${error.message}`);
    }
  }

  async deleteJobMetadata(jobId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      if (!client) return;
      const key = this.getWorkerMetadataKey(jobId);
      await client.del(key);
      this.logger.debug(`Deleted job metadata: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to delete job metadata: ${error.message}`);
    }
  }

  /**
   * Comprehensive cleanup for a completed job in worker
   * Removes all Redis entries related to the job
   */
  async cleanupCompletedJob(jobId: string): Promise<void> {
    try {
      const cleanupPromises: Promise<void>[] = [];

      // Clean up job result and metadata
      cleanupPromises.push(this.deleteJobResult(jobId));
      cleanupPromises.push(this.deleteJobMetadata(jobId));

      // Execute all cleanup operations in parallel
      await Promise.allSettled(cleanupPromises);

      this.logger.debug(`Completed cleanup for job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup job ${jobId}: ${error.message}`);
    }
  }
}
