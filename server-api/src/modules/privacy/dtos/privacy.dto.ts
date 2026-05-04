// privacy.dto.ts
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PrivacySettingsDto {
  @ApiProperty({
    description: 'Consent for processing personal data',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  dataProcessing?: boolean;

  @ApiProperty({
    description: 'Consent for receiving newsletter',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  newsletter?: boolean;

  @ApiProperty({
    description: 'Acceptance of Terms of Service',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional() // Cho phép nullable
  termsAccepted?: boolean;

  @ApiProperty({
    description: 'Acceptance of Privacy Policy',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  privacyAccepted: boolean;
}

// You might also want a response DTO that includes timestamps
export class PrivacySettingsResponseDto extends PrivacySettingsDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-02-10T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-10T12:00:00Z',
  })
  updatedAt: Date;
}
