import { ApiProperty } from '@nestjs/swagger';

export class EnhancePromptResponseDto {
  @ApiProperty({
    description: 'The enhanced prompt',
    example:
      'A breathtaking sunset over a serene ocean, with vibrant orange and pink hues painting the sky, gentle waves reflecting the warm light, shot with professional photography techniques, golden hour lighting, high resolution, cinematic composition',
  })
  enhancedPrompt: string;

  @ApiProperty({
    description: 'The original prompt that was enhanced',
    example: 'a beautiful sunset',
  })
  originalPrompt: string;

  @ApiProperty({
    description: 'Number of tokens used in the enhancement',
    example: 156,
  })
  tokensUsed: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1500,
  })
  processingTime: number;

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;
}
