import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiProperty({ example: 1, required: false, description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ example: 10, required: false, description: 'Page size (default: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ example: 'ADMIN', required: false, description: 'Filter by user type (ADMIN or MEMBER)' })
  @IsOptional()
  @IsString()
  userType?: 'ADMIN' | 'MEMBER';
}
