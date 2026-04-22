import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenerationStatus } from '../../../domain/generation/generation-status';

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface GenerationParams {
  prompt: string;
  seed: number;
  aspect_ratio?: string;
  image_prompt?: string;
  input_image?: string;
  control_image?: string;
  finetune_id?: string;
  finetune_strength?: number;
  image_prompt_strength?: number;
  guidance?: number;
  webhook_url?: string;
  webhook_secret?: string;
}

export class ImageRequestDto {
  @ApiProperty({ description: 'Request identifier' })
  id: string;

  @ApiProperty({ description: 'User identifier' })
  userId: string;

  @ApiProperty({ description: 'Generation method' })
  method: string;

  @ApiProperty({ description: 'Original generation parameters' })
  parameters: GenerationParams;

  @ApiProperty({
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      ...Object.values(GenerationStatus),
    ],
    description: 'Request status',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed' | GenerationStatus;

  @ApiProperty({ description: 'Request creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Request update timestamp' })
  updatedAt?: Date;
}

export class ImageJobDto {
  @ApiProperty({ description: 'Job identifier' })
  id: string;

  @ApiProperty({ description: 'Request identifier' })
  requestId: string;

  @ApiProperty({ description: 'AI model name' })
  modelName: string;

  @ApiProperty({ description: 'AI provider name' })
  provider: string;

  @ApiProperty({
    enum: [
      'queued',
      'processing',
      'completed',
      'failed',
      ...Object.values(GenerationStatus),
    ],
    description: 'Job status',
  })
  status: 'queued' | 'processing' | 'completed' | 'failed' | GenerationStatus;

  @ApiPropertyOptional({ description: 'Stored queue payload for retry' })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Error information if failed' })
  error?: string;

  @ApiProperty({ description: 'Job creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Job update timestamp' })
  updatedAt?: Date;

  @ApiPropertyOptional({ description: 'Job start timestamp' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Job completion timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Job cancellation timestamp' })
  cancelledAt?: Date;
}

export class JobResultDto {
  @ApiProperty({ description: 'Job identifier' })
  jobId: string;

  @ApiProperty({ description: 'User identifier' })
  userId: string;

  @ApiProperty({ description: 'Generated attribute identifier' })
  attributeId: string;

  @ApiProperty({ description: 'Attribute version' })
  version: string;

  @ApiProperty({ description: 'Generated image path/URL' })
  imagePath: string;

  @ApiProperty({ description: 'Generation method used' })
  method: string;

  @ApiProperty({ description: 'Total processing time in milliseconds' })
  processingTime: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: {
    inputValue?: number;
    styleValue?: number;
    creativityValue?: number;
    imageSize?: string;
    lora?: string;
    steps?: number;
    guidance?: number;
    provider?: string;
    model?: string;
    prompt?: string;
  };

  @ApiProperty({ description: 'Generation timestamp' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Image thumbnail URL' })
  thumbnailUrl?: string;
}

export class ImageGenerationResponseDto {
  @ApiProperty({ description: 'Job identifiers' })
  jobIds: string[];

  @ApiProperty({ description: 'Request identifier' })
  requestId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;
}

export class JobStatusResponseDto {
  @ApiProperty({ description: 'Job identifier' })
  jobId: string;

  @ApiProperty({ enum: JobStatus, description: 'Current job status' })
  status: JobStatus;

  @ApiProperty({ description: 'Processing progress (0-100)' })
  progress: number;

  @ApiPropertyOptional({ description: 'Status message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Job result if completed' })
  result?: JobResultDto;

  @ApiPropertyOptional({ description: 'Error details if failed' })
  error?: {
    message: string;
    code?: string;
    details?: any;
    timestamp?: string;
    stack?: string;
  };

  @ApiPropertyOptional({ description: 'Job creation timestamp' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Job start timestamp' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Job completion timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Number of retry attempts' })
  retries?: number;

  @ApiPropertyOptional({ description: 'Job metadata' })
  metadata?: {
    method?: string;
    imageSize?: string;
    queuedAt?: Date;
    [key: string]: any;
  };
}

export class GenerateImageResponse {
  @ApiProperty({ description: 'Generated image information' })
  generatedImage: {
    Key: string;
    Location: string;
    Thumbnail?: string;
  };

  @ApiProperty({ description: 'Sample image path' })
  sample: string;

  @ApiPropertyOptional({ description: 'Attribute identifier' })
  attributeId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

export class HealthCheckDto {
  @ApiProperty({ description: 'Overall health status' })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: 'Health check details' })
  details: {
    redis: 'connected' | 'disconnected';
    queue: {
      healthy: boolean;
      details: any;
    };
    worker?: {
      running: boolean;
      concurrency: number;
      activeJobs: number;
    };
    timestamp: string;
  };

  @ApiPropertyOptional({ description: 'Error message if unhealthy' })
  error?: string;
}
