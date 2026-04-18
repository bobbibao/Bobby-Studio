import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CancelQueuedJobResult,
  IGenerationQueue,
  QueueGenerationJobInput,
  QueueStats,
} from '../../application/generation/interfaces/generation-queue.interface';

@Injectable()
export class BullMqGenerationQueue implements IGenerationQueue {
  constructor(@InjectQueue('image-generation') private readonly queue: Queue) {}

  async queueGenerationJob(input: QueueGenerationJobInput): Promise<void> {
    await this.queue.add('image-generation', input.data, {
      attempts: input.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      delay: 0,
      jobId: input.jobId,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  async cancelGenerationJob(jobId: string): Promise<CancelQueuedJobResult> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { removed: false };
    }

    const state = await job.getState();
    if (['waiting', 'delayed', 'prioritized', 'paused'].includes(state)) {
      await job.remove();
      return { removed: true, state };
    }

    return { removed: false, state };
  }

  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
