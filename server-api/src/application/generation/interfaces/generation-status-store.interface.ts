export const GENERATION_STATUS_STORE = Symbol('GENERATION_STATUS_STORE');

export interface IGenerationStatusStore {
  setJobStatus(jobId: string, progress: number, status: string, message?: string): Promise<void>;
  getJobStatus(jobId: string): Promise<Record<string, any> | null>;
  setJobMetadata(jobId: string, metadata: Record<string, unknown>): Promise<void>;
  setJobResult(jobId: string, result: Record<string, unknown>): Promise<void>;
  setJobError(jobId: string, error: unknown): Promise<void>;
  addUserJob(userId: string, jobId: string): Promise<void>;
}
