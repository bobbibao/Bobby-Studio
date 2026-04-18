import { GenerationStatus } from './generation-status';

export interface GenerationRequest {
  id: string;
  userId: string;
  method: string;
  parameters: Record<string, unknown>;
  status: GenerationStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface GenerationJob {
  id: string;
  requestId: string;
  modelName: string;
  provider: string;
  status: GenerationStatus;
  payload?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}
