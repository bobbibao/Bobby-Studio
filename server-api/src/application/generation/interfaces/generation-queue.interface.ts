export const GENERATION_QUEUE = Symbol('GENERATION_QUEUE');

export interface QueueGenerationJobInput {
  jobId: string;
  data: Record<string, unknown>;
  attempts?: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface CancelQueuedJobResult {
  removed: boolean;
  state?: string;
}

export interface IGenerationQueue {
  queueGenerationJob(input: QueueGenerationJobInput): Promise<void>;
  cancelGenerationJob(jobId: string): Promise<CancelQueuedJobResult>;
  getStats(): Promise<QueueStats>;
}
