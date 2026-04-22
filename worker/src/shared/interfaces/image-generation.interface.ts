import { ImageGenerationMethod, ProcessingStage } from '../enums/image-providers.enum';

export interface ImageGenerationJobData {
  jobId: string;
  requestId?: string; // For batch grouping
  method: ImageGenerationMethod;
  generateImageParams?: any;
  editImageParams?: any;
  endpoint: string;
  provider?: string;
  connectorFunction?: string;
  
}

export interface PostProcessingJobData {
  jobId: string;
  requestId?: string; // For batch grouping
  userId: string;
  userEmail: string;
  sourceJobId?: string;
  imageUrl: string;
  generateImageParams?: any;
  editImageParams?: any;
  method: ImageGenerationMethod;
  credit: number;
  shouldWatermark?: boolean;
  endpoint: string;
  metadata: {
    creativityValue?: number;
    inputValue?: number;
    styleValue?: number;
    aspectRatio: string;
    lora?: string;
    model?: string;
  };
}

export interface ImageJobStatus {
  jobId: string;
  processor: string;
  imageJobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout' | 'submitted' | 'ready';
  imageUrl?: string;
  error?: string;
  lastChecked?: string;
  retries?: number;
}

export interface ImageGenerationJobResult {
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

    original?:{
      location?: string;
      eTag?: string;
      bucket?: string;
      thumbnail?: string;
    }


  };
  credit: number;
  shouldWatermark?: boolean;
  method: string;
  generatedAt: Date;
  provider?: string;
  model?: string;
  error?: string;
}

export interface JobProgress {
  stage: ProcessingStage;
  percentage: number;
  message?: string;
}

export interface ProgressCallback {
  (progress: JobProgress): Promise<void>;
}

export interface GenerateImageResponse {
  generatedImage: {
    key: string;
    location: string;
    thumbnail?: string;
  };
  sample: string;
  attributeId?: string;
  metadata?: any;
}
