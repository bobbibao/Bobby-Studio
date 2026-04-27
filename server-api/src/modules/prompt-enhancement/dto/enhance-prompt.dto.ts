import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InputTypeEnum } from '../../../constant/attribute-type.enum';

export class EnhancePromptDto {
  @ApiProperty({
    description: 'The original prompt to enhance',
    example: 'a beautiful sunset',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000, { message: 'Prompt cannot exceed 2000 characters' })
  originalPrompt: string;

  @ApiPropertyOptional({
    description: 'Input type to determine enhancement strategy',
    enum: InputTypeEnum,
    example: InputTypeEnum.TEXT_PROMPT,
  })
  @IsOptional()
  @IsEnum(InputTypeEnum)
  inputType?: InputTypeEnum;

  @ApiPropertyOptional({
    description: 'Maximum tokens for the enhanced prompt',
    minimum: 10,
    maximum: 500,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  maxTokens?: number = 500;

  @ApiPropertyOptional({
    description: 'Temperature for creativity (0.0 to 1.0)',
    minimum: 0,
    maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number = 0.7;
}
