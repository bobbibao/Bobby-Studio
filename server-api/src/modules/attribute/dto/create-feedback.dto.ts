import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType } from 'src/constant/feedback.enum';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Unique identifier of the attribute receiving feedback',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID()
  @IsNotEmpty()
  attributeId: string;

  @ApiProperty({
    description: 'Version identifier of the attribute',
    example: 'v1.0.0'
  })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    description: 'Unique identifier of the user providing feedback',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Type of feedback provided',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE,
    enumName: 'FeedbackType'
  })
  @IsEnum(FeedbackType, {
    message: 'Type must be either "positive" or "negative"'
  })
  type: FeedbackType;

  @ApiProperty({
    description: 'Categories that the feedback applies to',
    example: ['design', 'usability', 'performance'],
    isArray: true,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiPropertyOptional({
    description: 'Additional text comment with the feedback',
    example: 'The design looks great, but could use some performance improvements.',
    required: false
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
