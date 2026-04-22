import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SdxlGenerationMode {
  TEXT_TO_IMAGE = 'text_to_image',
  SKETCH_TO_IMAGE = 'sketch_to_image',
  IMAGE_TO_IMAGE = 'image_to_image',
}

export enum SdxlControlNetType {
  CANNY = 'canny',
  LINEART = 'lineart',
}

export class SdxlControlNetDto {
  @ApiProperty({ enum: SdxlControlNetType, default: SdxlControlNetType.LINEART })
  @IsEnum(SdxlControlNetType)
  controlnet_type: SdxlControlNetType;

  @ApiProperty({ minimum: 0, maximum: 1, default: 0.9 })
  @IsNumber()
  @Min(0)
  @Max(1)
  controlnet_scale: number;
}

export class SdxlLoraDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  lora_enabled: boolean;

  @ApiProperty({ minimum: 0, maximum: 1.5, default: 0.85 })
  @IsNumber()
  @Min(0)
  @Max(1.5)
  lora_scale: number;

  @ApiPropertyOptional({ default: 'house_lora_final' })
  @IsOptional()
  @IsString()
  lora_path?: string;
}

export class SdxlInferenceDto {
  @ApiProperty({ minimum: 1, maximum: 80, default: 30 })
  @IsNumber()
  @Min(1)
  @Max(80)
  num_inference_steps: number;

  @ApiProperty({ minimum: 1, maximum: 20, default: 7.5 })
  @IsNumber()
  @Min(1)
  @Max(20)
  guidance_scale: number;

  @ApiProperty({ minimum: 512, maximum: 1536, default: 1024 })
  @IsNumber()
  @Min(512)
  @Max(1536)
  width: number;

  @ApiProperty({ minimum: 512, maximum: 1536, default: 1024 })
  @IsNumber()
  @Min(512)
  @Max(1536)
  height: number;

  @ApiPropertyOptional({ default: 42 })
  @IsOptional()
  @IsNumber()
  seed?: number;
}

export class SdxlGenerateImageDto {
  @ApiPropertyOptional({ description: 'User ID requesting the generation' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'User email for generated asset ownership' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ description: 'Project ID to associate with' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Folder ID to associate with' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiProperty({ enum: SdxlGenerationMode })
  @IsEnum(SdxlGenerationMode)
  mode: SdxlGenerationMode;

  @ApiProperty({ description: 'Positive generation prompt' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Negative prompt for SDXL guidance' })
  @IsOptional()
  @IsString()
  negative_prompt?: string;

  @ApiPropertyOptional({
    description:
      'Base64 input image for sketch-to-image or image-to-image. Data URLs are accepted and normalized by the worker.',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ type: SdxlControlNetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SdxlControlNetDto)
  controlnet?: SdxlControlNetDto;

  @ApiPropertyOptional({ type: SdxlLoraDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SdxlLoraDto)
  lora?: SdxlLoraDto;

  @ApiProperty({ type: SdxlInferenceDto })
  @ValidateNested()
  @Type(() => SdxlInferenceDto)
  inference: SdxlInferenceDto;

  @ApiPropertyOptional({
    description: 'Denoising strength for image-to-image',
    minimum: 0,
    maximum: 1,
    default: 0.55,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  strength?: number;

  @ApiPropertyOptional({ description: 'Whether the frontend enhanced the prompt' })
  @IsOptional()
  @IsBoolean()
  prompt_enhancement_enabled?: boolean;
}
