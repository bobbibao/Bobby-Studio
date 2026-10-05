import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CreateGenerationRequest,
  GENERATION_INTENTS,
  GENERATION_MODES,
  GENERATION_QUALITIES,
  GenerationIntent,
  GenerationMode,
  GenerationQuality,
} from './generation.contracts';

export const MAX_PROMPT_CHARS = 4000;
export const MAX_DIMENSION = 4096;

export class GenerationSizeDto {
  @IsInt()
  @Min(64)
  @Max(MAX_DIMENSION)
  width!: number;

  @IsInt()
  @Min(64)
  @Max(MAX_DIMENSION)
  height!: number;
}

/**
 * Validated with whitelist + forbidNonWhitelisted: a body userId, price, credit amount, API key or
 * endpoint is rejected rather than silently ignored.
 */
export class CreateGenerationDto implements CreateGenerationRequest {
  @IsUUID()
  studioSessionId!: string;

  @IsInt()
  @Min(0)
  clientRevision!: number;

  @IsIn(GENERATION_INTENTS)
  intent!: GenerationIntent;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modelId!: string;

  @IsIn(GENERATION_MODES)
  mode!: GenerationMode;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PROMPT_CHARS)
  prompt!: string;

  @IsOptional()
  @IsUUID()
  inputAssetId?: string;

  @ValidateNested()
  @Type(() => GenerationSizeDto)
  size!: GenerationSizeDto;

  @IsIn(GENERATION_QUALITIES)
  quality!: GenerationQuality;
}
