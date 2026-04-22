import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsObject,
  IsOptional,
  IsNumber,
} from 'class-validator';
import {
  GenerateImageDTO,
  ImageGenerationMethod,
  ImageToImageDto,
  ImageUpscalingDto,
  LineDrawingToImageDto,
  TextToImageDto,
} from './image-generation-job.dto';

export class ImageGenerationRequestDto {
  @ApiProperty({ description: 'Unique job identifier' })
  @IsString()
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional({ description: 'Request ID for batch grouping' })
  @IsOptional()
  @IsString()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ description: 'Generation parameters' })
  @IsObject()
  generateImageParams: GenerateImageDTO<
    TextToImageDto | ImageToImageDto | LineDrawingToImageDto | ImageUpscalingDto
  >;

  @ApiPropertyOptional({ description: 'Endpoint for the generation method' })
  endpoint: string;
  @ApiPropertyOptional({ description: 'Endpoint for the generation method' })
  provider?: string;
  @ApiPropertyOptional({ description: 'Connector function hint for worker' })
  connectorFunction?: string;
}

export class JobStatusRequestDto {
  @ApiProperty({ description: 'Job identifier to check status for' })
  @IsString()
  @IsUUID()
  jobId: string;
}

export class JobResultRequestDto {
  @ApiProperty({ description: 'Job identifier to get result for' })
  @IsString()
  @IsUUID()
  jobId: string;
}
