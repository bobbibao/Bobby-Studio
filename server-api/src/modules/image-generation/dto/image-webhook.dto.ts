import { ImageGenerationMethod } from './image-generation-job.dto';

export enum eventType {
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_ACTIVE = 'job.active',
  JOB_PROGRESS = 'job.progress',
  JOB_CANCELLED = 'job.cancelled',
}

export class ImageWebhookDto {
  event: eventType;
  data: ImageGenerationJobInProgressData | ImageGenerationJobResultData;
}

export interface ImageGenerationJobInProgressData {
  jobId: string;
  method: ImageGenerationMethod;
  generateImageParams: any;
  endpoint: string;
  progress: number;
}

export interface ImageGenerationJobResultData {
  jobId: string;
  requestId?: string; // For batch grouping
  attributeId: string;
  version: string;
  previousImageId?: string;
  generateImageParams?: any;
  editImageParams?: any;
  generatedImage: {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
    thumbnail?: string;
    dimensions?: string;
    creationType?: string;
    inputType?: string;
    selectedStyle?: string;
    prompt?: string;
    original?: {
      location?: string;
      eTag?: string;
      bucket?: string;
      thumbnail?: string;
    }

  };
  method: string;
  credit?: number;
  generatedAt: Date;
  model?: string; // Model endpoint used for generation
  modelIndex?: number; // Index in multi-model generation
  parentJobId?: string; // Original job ID for multi-model grouping
}
