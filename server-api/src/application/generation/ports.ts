import { GenerationQueueMessageV1, GenerationUpdatedEvent } from './contracts';

/** Transport to the worker. BullMQ in production; the job id doubles as the queue's dedupe key. */
export const GENERATION_QUEUE = Symbol('GENERATION_QUEUE');
export interface GenerationQueue {
  /** Idempotent: publishing the same jobId twice never creates two queue entries. */
  publish(message: GenerationQueueMessageV1): Promise<void>;
  /** Best effort removal of an unclaimed entry; the claim also refuses cancelled jobs. */
  remove(jobId: string): Promise<void>;
  /** Number of entries waiting for a worker (diagnostics and backpressure). */
  waitingCount(): Promise<number>;
}

/** Realtime hint channel. Delivery is best effort; REST snapshots are the recovery path. */
export const GENERATION_NOTIFIER = Symbol('GENERATION_NOTIFIER');
export interface GenerationNotifier {
  jobUpdated(userId: string, event: GenerationUpdatedEvent): void;
}
