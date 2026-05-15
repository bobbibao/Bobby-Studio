import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Free credit amount',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeCredit?: number;

  @ApiProperty({
    description: 'Paid credit amount',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidCredit?: number;

  @ApiProperty({
    description: 'Admin status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @ApiProperty({
    description: 'Active status (false = soft delete)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User updated successfully' })
  message: string;

  @ApiProperty({ example: ['paidCredit', 'isAdmin'] })
  updatedFields: string[];
}
