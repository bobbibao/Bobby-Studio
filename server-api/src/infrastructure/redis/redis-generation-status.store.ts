import { Injectable } from '@nestjs/common';
import { IGenerationStatusStore } from '../../application/generation/interfaces/generation-status-store.interface';
import { RedisService } from '../../shared/services/redis.service';

@Injectable()
export class RedisGenerationStatusStore implements IGenerationStatusStore {
  constructor(private readonly redisService: RedisService) {}

  setJobStatus(jobId: string, progress: number, status: string, message?: string): Promise<void> {
    return this.redisService.setJobStatus(jobId, progress, status, message);
  }

  getJobStatus(jobId: string): Promise<Record<string, any> | null> {
    return this.redisService.getJobStatus(jobId);
  }

  setJobMetadata(jobId: string, metadata: Record<string, unknown>): Promise<void> {
    return this.redisService.setJobMetadata(jobId, metadata);
  }

  setJobResult(jobId: string, result: Record<string, unknown>): Promise<void> {
    return this.redisService.setJobResult(jobId, result);
  }

  setJobError(jobId: string, error: unknown): Promise<void> {
    return this.redisService.setJobError(jobId, error);
  }

  addUserJob(userId: string, jobId: string): Promise<void> {
    return this.redisService.addUserJob(userId, jobId);
  }
}
