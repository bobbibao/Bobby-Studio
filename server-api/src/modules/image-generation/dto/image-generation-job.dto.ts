import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import {
  CreationTypeEnum,
  InputTypeEnum,
} from 'src/constant/attribute-type.enum';

export enum ImageGenerationMethod {
  BASIC_TEXT_TO_IMAGE = 'BASIC_TEXT_TO_IMAGE',
  PRO_TEXT_TO_IMAGE = 'PRO_TEXT_TO_IMAGE',
  BASIC_LINE_DRAWING_TO_IMAGE = 'BASIC_LINE_DRAWING_TO_IMAGE',
  PRO_LINE_DRAWING_TO_IMAGE = 'PRO_LINE_DRAWING_TO_IMAGE',
  BASIC_IMAGE_UPSCALING = 'BASIC_IMAGE_UPSCALING',
  PRO_IMAGE_UPSCALING = 'PRO_IMAGE_UPSCALING',
  BASIC_IMAGE_TO_IMAGE = 'BASIC_IMAGE_TO_IMAGE',
  PRO_IMAGE_TO_IMAGE = 'PRO_IMAGE_TO_IMAGE',
}

export class GenerateImageDTO<D> {
  @ApiProperty({ description: 'User ID requesting the generation' })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'User Email Address' })
  @IsString()
  userEmail: string;

  @ApiProperty({ enum: ImageGenerationMethod })
  @IsEnum(ImageGenerationMethod)
  method: ImageGenerationMethod;

  @ApiPropertyOptional({ description: 'Project ID to associate with' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Folder ID to associate with' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Credit cost for the generation' })
  @IsOptional()
  @IsNumber()
  credit?: number;


  @ApiPropertyOptional({ description: 'Whether to apply watermark to the generated image' })
  @IsOptional()
  @IsBoolean()
  shouldWatermark?: boolean;

  @ApiPropertyOptional({
    description: 'Selected models for image generation (Pro mode)',
    type: [String],
  })
  @IsOptional()
  selectedModels?: string[];

  @ApiProperty({ description: 'Data for image generation' })
  data: D;
}
export class BaseImageGenerationDto {
  @ApiProperty({ description: 'Image size (e.g., 1024x1024)' })
  @IsString()
  imageSize: string;

  @ApiProperty({ description: 'Random seed for generation' })
  @IsNumber()
  seed: number;

  @ApiProperty({ enum: CreationTypeEnum })
  @IsEnum(CreationTypeEnum)
  creationType: CreationTypeEnum;

  @ApiProperty({ enum: InputTypeEnum })
  @IsEnum(InputTypeEnum)
  inputType: InputTypeEnum;

  @ApiPropertyOptional({ description: 'Input value for generation' })
  @IsOptional()
  @IsNumber()
  inputValue?: number;

  @ApiPropertyOptional({ description: 'Style value for generation' })
  @IsOptional()
  @IsNumber()
  styleValue?: number;

  @ApiPropertyOptional({ description: 'Creative value for generation' })
  @IsOptional()
  @IsNumber()
  creativityValue?: number;

  @ApiPropertyOptional({ description: 'Selected style for generation' })
  @IsOptional()
  @IsString()
  selectedStyle?: string;

  @ApiPropertyOptional({ description: 'LoRA model to use' })
  @IsOptional()
  @IsString()
  lora?: string;

  @ApiPropertyOptional({
    description: 'Selected models for image generation (Pro mode)',
    type: [String],
  })
  @IsOptional()
  selectedModels?: string[];
}

export class TextToImageDto extends BaseImageGenerationDto {
  @ApiProperty({ description: 'Text prompt for image generation' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Enhanced prompt for image generation' })
  @IsString()
  enhancedPrompt: string;

  @ApiProperty({ description: 'Enabled AI prompt' })
  @IsBoolean()
  enabledAiPrompt: boolean;

  @ApiProperty({ description: 'Template to use' })
  @IsString()
  template: string;

  @ApiPropertyOptional({ description: 'Number of steps (Pro only)' })
  @IsOptional()
  @IsNumber()
  step?: number;

  @ApiPropertyOptional({ description: 'Guidance scale (Pro only)' })
  @IsOptional()
  @IsNumber()
  guidance?: number;
}

export class ImageToImageDto extends BaseImageGenerationDto {
  @ApiProperty({ description: 'Source image ID' })
  @IsString()
  imageId: string;

  @ApiProperty({ description: 'Source image path' })
  @IsString()
  imagePath: string;

  @ApiProperty({ description: 'Text prompt for image generation' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Enhanced prompt for image generation' })
  @IsString()
  enhancedPrompt: string;

  @ApiProperty({ description: 'Enabled AI prompt' })
  @IsBoolean()
  enabledAiPrompt: boolean;

  @ApiProperty({ description: 'Control strength (0.0 - 1.0)' })
  @IsNumber()
  inputValue: number;

  @ApiPropertyOptional({ description: 'Number of steps (Pro only)' })
  @IsOptional()
  @IsNumber()
  step?: number;

  @ApiPropertyOptional({ description: 'Guidance scale (Pro only)' })
  @IsOptional()
  @IsNumber()
  guidance?: number;
}

export class LineDrawingToImageDto extends BaseImageGenerationDto {
  @ApiProperty({ description: 'Source image ID' })
  @IsString()
  imageId: string;

  @ApiProperty({ description: 'Source image path' })
  @IsString()
  imagePath: string;

  @ApiProperty({ description: 'Control strength (0.0 - 1.0)' })
  @IsNumber()
  inputValue: number;

  @ApiPropertyOptional({ description: 'Text prompt for image generation' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiProperty({ description: 'Enhanced prompt for image generation' })
  @IsString()
  enhancedPrompt: string;

  @ApiProperty({ description: 'Enabled AI prompt' })
  @IsBoolean()
  enabledAiPrompt: boolean;

  @ApiPropertyOptional({ description: 'Prompt keywords (Basic mode)' })
  @IsOptional()
  @IsString()
  promptKeywords?: string;

  @ApiPropertyOptional({ description: 'Number of steps (Pro only)' })
  @IsOptional()
  @IsNumber()
  step?: number;

  @ApiPropertyOptional({ description: 'Guidance scale (Pro only)' })
  @IsOptional()
  @IsNumber()
  guidance?: number;
}

export class ImageUpscalingDto extends BaseImageGenerationDto {
  @ApiProperty({ description: 'Source image ID' })
  @IsString()
  imageId: string;

  @ApiProperty({ description: 'Source image path' })
  @IsString()
  imagePath: string;

  @ApiProperty({ description: 'Upscale factor' })
  @IsNumber()
  upscaleBy: number;

  @ApiPropertyOptional({ description: 'Upscale model (Pro only)' })
  @IsOptional()
  @IsString()
  upscaleModel?: string;

  @ApiPropertyOptional({ description: 'Number of steps (Pro only)' })
  @IsOptional()
  @IsNumber()
  step?: number;
}
