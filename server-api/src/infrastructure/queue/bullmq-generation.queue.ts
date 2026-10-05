import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { GenerationQueueMessageV1 } from '../../application/generation/contracts';
import { GenerationQueue } from '../../application/generation/ports';

export const GENERATION_QUEUE_NAME = 'generation-jobs';

/**
 * BullMQ transport. The queue job id is the generation job id, so republishing after a crash between
 * enqueue and the published marker cannot create a second queue entry. BullMQ owns retries of delivery
 * and execution (bounded attempts with exponential backoff); the provider adapters never retry.
 */
@Injectable()
export class BullMqGenerationQueue implements GenerationQueue {
  constructor(@InjectQueue(GENERATION_QUEUE_NAME) private readonly queue: Queue) {}

  async publish(message: GenerationQueueMessageV1): Promise<void> {
    await this.queue.add('generate', message, {
      jobId: message.jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    });
  }

  async remove(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job && (await job.isWaiting())) await job.remove();
  }

  async waitingCount(): Promise<number> {
    return this.queue.getWaitingCount();
  }
}
