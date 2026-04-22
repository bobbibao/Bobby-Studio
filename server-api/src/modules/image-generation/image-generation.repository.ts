import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../shared/services/redis.service';
import { ImageRequestDto, ImageJobDto, GenerationParams } from './dto/image-response.dto';
import {
  GenerationStatus,
  toGenerationStatus,
} from '../../domain/generation/generation-status';

export interface CreateImageRequestData {
  userId: string;
  method: string;
  parameters: Record<string, unknown>;
}

export interface CreateImageJobData {
  jobId: string;
  requestId: string;
  modelName: string;
  provider: string;
  payload?: Record<string, unknown>;
}

export interface UpdateImageRequestStatusData {
  requestId: string;
  status: GenerationStatus | string;
}

export interface UpdateImageJobStatusData {
  jobId: string;
  status: GenerationStatus | string;
  error?: string;
}

type ImageRequestStatus = ImageRequestDto['status'];
type ImageJobStatus = ImageJobDto['status'];

export interface BatchCompletionResult {
  total: number;
  completed: number;
  failed: number;
  isComplete: boolean;
}

export interface UpdateProjectAttributeData {
  projectId: string;
  version: string;
  value: Prisma.InputJsonValue;
}

@Injectable()
export class ImageGenerationRepository {
  private readonly logger = new Logger(ImageGenerationRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // Cache TTL constants
  private readonly REQUEST_CACHE_TTL = 1800; // 30 minutes
  private readonly JOB_CACHE_TTL = 1800; // 30 minutes

  // Helper method to generate cache keys
  private getCacheKey(type: 'request' | 'job', id: string): string {
    return `img_gen:${type}:${id}`;
  }

  // Method to invalidate cache when records are updated
  async invalidateCache(requestId?: string, jobId?: string): Promise<void> {
    const cacheKeys: string[] = [];

    if (requestId) {
      // cacheKeys.push(this.getCacheKey('request', requestId));
    }
    if (jobId) {
      // cacheKeys.push(this.getCacheKey('job', jobId));
    }

    if (cacheKeys.length > 0) {
      await Promise.all(cacheKeys.map((key) => this.redisService.del(key)));
    }
  }

  /**
   * Create an ImageRequest record in the database
   */
  async createImageRequest(data: CreateImageRequestData): Promise<string> {
    try {
      const requestId = randomUUID();
      const imageRequest = await this.prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "ImageRequest" (id, "userId", method, parameters, status, "createdAt")
        VALUES (${requestId}, ${data.userId}, ${data.method}, ${JSON.stringify(data.parameters)}::jsonb, ${GenerationStatus.PENDING}, NOW())
        RETURNING id
      `;

      const createdId = imageRequest[0].id;

      // Cache the created request
      const requestDto: ImageRequestDto = {
        id: createdId,
        userId: data.userId,
        method: data.method,
        parameters: data.parameters as unknown as GenerationParams,
        status: GenerationStatus.PENDING as any,
        createdAt: new Date(),
      };

      await this.redisService.set(
        this.getCacheKey('request', createdId),
        JSON.stringify(requestDto),
        this.REQUEST_CACHE_TTL,
      );

      return createdId;
    } catch (error) {
      this.logger.error(`Failed to create ImageRequest: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an ImageJob record in the database
   */
  async createImageJob(data: CreateImageJobData): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO "ImageJob" (id, "requestId", "modelName", provider, status, payload, "createdAt")
        VALUES (${data.jobId}, ${data.requestId}, ${data.modelName}, ${data.provider}, ${GenerationStatus.QUEUED}, ${data.payload ? JSON.stringify(data.payload) : null}::jsonb, NOW())
      `;

      // Cache the created job
      const jobDto: ImageJobDto = {
        id: data.jobId,
        requestId: data.requestId,
        modelName: data.modelName,
        provider: data.provider,
        status: GenerationStatus.QUEUED as any,
        createdAt: new Date(),
      };

      await this.redisService.set(
        this.getCacheKey('job', data.jobId),
        JSON.stringify(jobDto),
        this.JOB_CACHE_TTL,
      );
    } catch (error) {
      this.logger.error(`Failed to create ImageJob: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update ImageRequest status
   */
  async updateImageRequestStatus(data: UpdateImageRequestStatusData): Promise<void> {
    try {
      const status = toGenerationStatus(data.status);
      await this.prisma.$queryRaw`
        UPDATE "ImageRequest"
        SET status = ${status}, "updatedAt" = NOW()
        WHERE id = ${data.requestId}
      `;

      // Invalidate cache
      await this.invalidateCache(data.requestId);
    } catch (error) {
      this.logger.error(`Failed to update ImageRequest status: ${error.message}`);
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Update ImageJob status
   */
  async updateImageJobStatus(data: UpdateImageJobStatusData): Promise<void> {
    try {
      const status = toGenerationStatus(data.status);
      await this.prisma.$queryRaw`
        UPDATE "ImageJob"
        SET
          status = ${status},
          error = ${data.error || null},
          "updatedAt" = NOW(),
          "startedAt" = CASE WHEN ${status} = ${GenerationStatus.PROCESSING} AND "startedAt" IS NULL THEN NOW() ELSE "startedAt" END,
          "completedAt" = CASE WHEN ${status} IN (${GenerationStatus.COMPLETED}, ${GenerationStatus.FAILED}) THEN NOW() ELSE "completedAt" END,
          "cancelledAt" = CASE WHEN ${status} = ${GenerationStatus.CANCELLED} THEN NOW() ELSE "cancelledAt" END
        WHERE id = ${data.jobId}
      `;

      // Invalidate cache
      await this.invalidateCache(undefined, data.jobId);
    } catch (error) {
      this.logger.error(`Failed to update ImageJob status: ${error.message}`);
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Check if all jobs in a request batch are completed
   */
  async checkBatchCompletion(requestId: string): Promise<BatchCompletionResult> {
    try {
      const result = await this.prisma.$queryRaw<
        { total: bigint; completed: bigint; failed: bigint }[]
      >`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE UPPER(status) IN (${GenerationStatus.COMPLETED}, ${GenerationStatus.FAILED}, ${GenerationStatus.CANCELLED})) as completed,
          COUNT(*) FILTER (WHERE UPPER(status) IN (${GenerationStatus.FAILED}, ${GenerationStatus.CANCELLED})) as failed
        FROM "ImageJob" WHERE "requestId" = ${requestId}
      `;

      if (result.length === 0) {
        return { total: 0, completed: 0, failed: 0, isComplete: false };
      }

      const { total, completed, failed } = result[0];
      const totalJobs = Number(total);
      const completedJobs = Number(completed);
      const failedJobs = Number(failed);

      const isComplete = totalJobs > 0 && totalJobs === completedJobs;

      if (isComplete) {
        const requestStatus = failedJobs > 0 ? GenerationStatus.FAILED : GenerationStatus.COMPLETED;
        await this.updateImageRequestStatus({
          requestId,
          status: requestStatus,
        });
      }

      return {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        isComplete,
      };
    } catch (error) {
      this.logger.error(`Failed to check batch completion: ${error.message}`);
      return { total: 0, completed: 0, failed: 0, isComplete: false };
    }
  }

  /**
   * Get requestId from jobId
   */
  async getRequestIdFromJobId(jobId: string): Promise<string | null> {
    try {
      // Try cache first
      const cachedJob = await this.redisService.get(this.getCacheKey('job', jobId));
      if (cachedJob && typeof cachedJob === 'string') {
        const jobDto = JSON.parse(cachedJob) as ImageJobDto;
        return jobDto.requestId;
      }

      // Fallback: lookup from database
      const jobRecord = await this.prisma.$queryRaw<{ requestId: string }[]>`
        SELECT "requestId" FROM "ImageJob" WHERE id = ${jobId}
      `;

      return jobRecord.length > 0 ? jobRecord[0].requestId : null;
    } catch (error) {
      this.logger.error(`Failed to get requestId from jobId: ${error.message}`);
      return null;
    }
  }

  /**
   * Get ImageRequest by ID
   */
  async getImageRequestById(requestId: string): Promise<ImageRequestDto | null> {
    try {
      // Try cache first
      const cachedRequest = await this.redisService.get(this.getCacheKey('request', requestId));
      if (cachedRequest && typeof cachedRequest === 'string') {
        return JSON.parse(cachedRequest) as ImageRequestDto;
      }

      // Fallback: lookup from database
      const request = await this.prisma.$queryRaw<
        {
          id: string;
          userId: string;
          method: string;
          parameters: GenerationParams;
          status: string;
          createdAt: Date;
          updatedAt?: Date;
        }[]
      >`
        SELECT id, "userId", method, parameters, status, "createdAt", "updatedAt"
        FROM "ImageRequest" WHERE id = ${requestId}
      `;

      if (request.length === 0) return null;

      const requestDto: ImageRequestDto = {
        id: request[0].id,
        userId: request[0].userId,
        method: request[0].method,
        parameters: request[0].parameters,
        status: toGenerationStatus(request[0].status) as ImageRequestStatus,
        createdAt: request[0].createdAt,
        updatedAt: request[0].updatedAt,
      };

      // Cache the result
      await this.redisService.set(
        this.getCacheKey('request', requestId),
        JSON.stringify(requestDto),
        this.REQUEST_CACHE_TTL,
      );

      return requestDto;
    } catch (error) {
      this.logger.error(`Failed to get ImageRequest by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get ImageJob by ID
   */
  async getImageJobById(jobId: string): Promise<ImageJobDto | null> {
    try {
      // Try cache first
      const cachedJob = await this.redisService.get(this.getCacheKey('job', jobId));
      if (cachedJob && typeof cachedJob === 'string') {
        return JSON.parse(cachedJob) as ImageJobDto;
      }

      // Fallback: lookup from database
      const job = await this.prisma.$queryRaw<
        {
          id: string;
          requestId: string;
          modelName: string;
          provider: string;
          status: string;
          error: string | null;
          payload: Record<string, unknown> | null;
          createdAt: Date;
          updatedAt?: Date;
          startedAt?: Date | null;
          completedAt?: Date | null;
          cancelledAt?: Date | null;
        }[]
      >`
        SELECT id, "requestId", "modelName", provider, status, error, payload, "createdAt", "updatedAt", "startedAt", "completedAt", "cancelledAt"
        FROM "ImageJob" WHERE id = ${jobId}
      `;

      if (job.length === 0) return null;

      const jobDto: ImageJobDto = {
        id: job[0].id,
        requestId: job[0].requestId,
        modelName: job[0].modelName,
        provider: job[0].provider,
        status: toGenerationStatus(job[0].status) as ImageJobStatus,
        payload: job[0].payload || undefined,
        error: job[0].error || undefined,
        createdAt: job[0].createdAt,
        updatedAt: job[0].updatedAt,
        startedAt: job[0].startedAt || undefined,
        completedAt: job[0].completedAt || undefined,
        cancelledAt: job[0].cancelledAt || undefined,
      };

      // Cache the result
      await this.redisService.set(
        this.getCacheKey('job', jobId),
        JSON.stringify(jobDto),
        this.JOB_CACHE_TTL,
      );

      return jobDto;
    } catch (error) {
      this.logger.error(`Failed to get ImageJob by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all jobs for a request
   */
  async getJobsByRequestId(requestId: string): Promise<ImageJobDto[]> {
    try {
      const jobs = await this.prisma.$queryRaw<
        {
          id: string;
          requestId: string;
          modelName: string;
          provider: string;
          status: string;
          error: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT id, "requestId", "modelName", provider, status, error, "createdAt"
        FROM "ImageJob" WHERE "requestId" = ${requestId}
        ORDER BY "createdAt" ASC
      `;

      return jobs.map((job) => ({
        id: job.id,
        requestId: job.requestId,
        modelName: job.modelName,
        provider: job.provider,
        status: job.status as ImageJobStatus,
        error: job.error || undefined,
        createdAt: job.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get jobs by requestId: ${error.message}`);
      return [];
    }
  }

  /**
   * Get requests by user ID with pagination
   */
  async getImageRequestsByUserId(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<ImageRequestDto[]> {
    try {
      const requests = await this.prisma.$queryRaw<
        {
          id: string;
          userId: string;
          method: string;
          parameters: GenerationParams;
          status: string;
          createdAt: Date;
        }[]
      >`
        SELECT id, "userId", method, parameters, status, "createdAt"
        FROM "ImageRequest" 
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return requests.map((request) => ({
        id: request.id,
        userId: request.userId,
        method: request.method,
        parameters: request.parameters,
        status: request.status as ImageRequestStatus,
        createdAt: request.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get requests by userId: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete old requests and their associated jobs (cleanup)
   */
  async deleteOldRequests(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // First delete jobs, then requests (due to foreign key constraints)
      const deletedJobs = await this.prisma.$queryRaw<{ count: bigint }[]>`
        DELETE FROM "ImageJob" 
        WHERE "requestId" IN (
          SELECT id FROM "ImageRequest" 
          WHERE "createdAt" < ${cutoffDate}
        )
      `;

      const deletedRequests = await this.prisma.$queryRaw<{ count: bigint }[]>`
        DELETE FROM "ImageRequest" WHERE "createdAt" < ${cutoffDate}
      `;

      const deletedCount = Number(deletedRequests[0]?.count || 0);

      this.logger.log(
        `Cleaned up ${deletedCount} old image requests and their jobs (older than ${olderThanDays} days)`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete old requests: ${error.message}`);
      return 0;
    }
  }

  /**
   * Update project attribute value
   */
  async updateProjectAttribute(data: UpdateProjectAttributeData): Promise<void> {
    try {
      await this.prisma.attribute.update({
        where: {
          id_version: {
            id: data.projectId,
            version: data.version,
          },
        },
        data: {
          value: data.value,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated project attribute ${data.projectId} version ${data.version}`);
    } catch (error) {
      this.logger.error(`Failed to update project attribute: ${error.message}`);
      throw error;
    }
  }

  async saveImageJobPayload(
    jobId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        UPDATE "ImageJob"
        SET payload = ${JSON.stringify(payload)}::jsonb, "updatedAt" = NOW()
        WHERE id = ${jobId}
      `;

      await this.invalidateCache(undefined, jobId);
    } catch (error) {
      this.logger.error(`Failed to save ImageJob payload: ${error.message}`);
      throw error;
    }
  }

  async getStoredJobPayload(jobId: string): Promise<Record<string, unknown> | null> {
    try {
      const rows = await this.prisma.$queryRaw<{ payload: Record<string, unknown> | null }[]>`
        SELECT payload FROM "ImageJob" WHERE id = ${jobId}
      `;

      return rows[0]?.payload || null;
    } catch (error) {
      this.logger.error(`Failed to load ImageJob payload: ${error.message}`);
      return null;
    }
  }

  /**
   * Get statistics about requests and jobs
   */
  async getStatistics(): Promise<{
    totalRequests: number;
    totalJobs: number;
    pendingRequests: number;
    completedRequests: number;
    failedRequests: number;
    queuedJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    try {
      const [requestStats, jobStats] = await Promise.all([
        this.prisma.$queryRaw<
          {
            total: bigint;
            pending: bigint;
            completed: bigint;
            failed: bigint;
          }[]
        >`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE UPPER(status) = ${GenerationStatus.PENDING}) as pending,
            COUNT(*) FILTER (WHERE UPPER(status) = ${GenerationStatus.COMPLETED}) as completed,
            COUNT(*) FILTER (WHERE UPPER(status) IN (${GenerationStatus.FAILED}, ${GenerationStatus.CANCELLED})) as failed
          FROM "ImageRequest"
        `,
        this.prisma.$queryRaw<
          {
            total: bigint;
            queued: bigint;
            processing: bigint;
            completed: bigint;
            failed: bigint;
          }[]
        >`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE UPPER(status) = ${GenerationStatus.QUEUED}) as queued,
            COUNT(*) FILTER (WHERE UPPER(status) = ${GenerationStatus.PROCESSING}) as processing,
            COUNT(*) FILTER (WHERE UPPER(status) = ${GenerationStatus.COMPLETED}) as completed,
            COUNT(*) FILTER (WHERE UPPER(status) IN (${GenerationStatus.FAILED}, ${GenerationStatus.CANCELLED})) as failed
          FROM "ImageJob"
        `,
      ]);

      const requestData = requestStats[0];
      const jobData = jobStats[0];

      return {
        totalRequests: Number(requestData?.total || 0),
        totalJobs: Number(jobData?.total || 0),
        pendingRequests: Number(requestData?.pending || 0),
        completedRequests: Number(requestData?.completed || 0),
        failedRequests: Number(requestData?.failed || 0),
        queuedJobs: Number(jobData?.queued || 0),
        processingJobs: Number(jobData?.processing || 0),
        completedJobs: Number(jobData?.completed || 0),
        failedJobs: Number(jobData?.failed || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      return {
        totalRequests: 0,
        totalJobs: 0,
        pendingRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        queuedJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
      };
    }
  }
}
