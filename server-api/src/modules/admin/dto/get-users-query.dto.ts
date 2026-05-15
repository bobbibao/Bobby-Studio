import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsString, IsIn, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersQueryDto {
  @ApiProperty({
    example: 1,
    required: false,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    example: 'user@example.com',
    required: false,
    description: 'Search by email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 'all',
    required: false,
    description: 'Filter by role',
    enum: ['all', 'free', 'basic', 'pro', 'team'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'free', 'basic', 'pro', 'team'])
  role?: 'all' | 'free' | 'basic' | 'pro' | 'team';

  @ApiProperty({
    example: 'all',
    required: false,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({
    example: 'all',
    required: false,
    description: 'Filter by admin status',
  })
  @IsOptional()
  @IsString()
  isAdmin?: string;

  @ApiProperty({
    example: 'all',
    required: false,
    description: 'Filter by email verified status',
  })
  @IsOptional()
  @IsString()
  emailVerified?: string;

  @ApiProperty({
    example: 'createdAt:desc,lastLogin:asc',
    required: false,
    description: 'Sort by field(s) with direction, comma-separated. Supports field[:asc|desc]',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';
}

export class GetUsersResponseDto {
  @ApiProperty({ description: 'List of users' })
  users: any[];

  @ApiProperty({ description: 'Total number of users' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class GetUserImageHistoryQueryDto {
  @ApiProperty({
    example: 'edit',
    required: false,
    description: 'Filter by input type (edit or generate)',
    enum: ['edit', 'generate'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['edit', 'generate'])
  inputType?: 'edit' | 'generate';

  @ApiProperty({
    example: 'method_name',
    required: false,
    description: 'Filter by method',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({
    example: '1024x1024',
    required: false,
    description: 'Filter by resolution',
  })
  @IsOptional()
  @IsString()
  @IsIn(['1K', '2K', '4K'])
  resolution?: '1K' | '2K' | '4K';

  @ApiProperty({
    example: '16:9',
    required: false,
    description: 'Filter by aspect ratio',
  })
  @IsOptional()
  @IsString()
  aspectRatio?: '21:9' | '16:9' | '3:2' | '4:3' | '1:1' | '3:4' | '2:3' | '9:16' | '9:21' | 'Original';

  @ApiProperty({
    example: 'model1,model2',
    required: false,
    description: 'Filter by selected editing models',
  })
  @IsOptional()
  @IsString()
  selectedEditingModels?: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    example: 'createdAt',
    required: false,
    description: 'Sort by field',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';
}
