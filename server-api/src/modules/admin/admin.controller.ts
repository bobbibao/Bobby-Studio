import {
  Controller,
  Get,
  UseGuards,
  Put,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from '../user/user.service';
import { AttributeService } from '../attribute/attribute.service';
import {
  UpdateUserDto,
  UpdateUserResponseDto,
} from './dto/update-user.dto';
import {
  GetUsersQueryDto,
  GetUsersResponseDto,
  GetUserImageHistoryQueryDto,
} from './dto/get-users-query.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard) // First check authentication
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly attributeService: AttributeService,
  ) {}

  @Get('users/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(
    @Param('id') userId: string,
  ): Promise<any> {
    const user = await this.userService.getById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Get('users')
  @UseGuards(AdminGuard) // Then check admin access
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users with pagination',
    type: GetUsersResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required'
  })
  async getAllUsers(
    @Query() query: GetUsersQueryDto,
  ): Promise<GetUsersResponseDto> {
    return this.userService.getAllUsers(query);
  }

  @Put('users/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update user fields (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid data',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    try {
      // Check if at least one field is provided
      const hasUpdates = Object.keys(updateUserDto).length > 0;
      if (!hasUpdates) {
        throw new HttpException(
          'At least one field must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Update user
      await this.userService.updateAdminFields(userId, updateUserDto);

      // Get updated fields
      const updatedFields = Object.keys(updateUserDto);

      return {
        success: true,
        message: 'User updated successfully',
        updatedFields,
      };
    } catch (error) {
      if (error.message === 'User not found') {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Get('history/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get user image history (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User image history',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getUserImageHistory(
    @Param('userId') userId: string,
    @Query() query: GetUserImageHistoryQueryDto,
  ): Promise<any> {
    return this.attributeService.getUserImageHistory(userId, query);
  }

  @Get('detail-history/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get user image history detail (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User image history detail',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getUserImageHistoryDetail(
    @Param('id') id: string
  ): Promise<any> {
    return this.attributeService.getAttributeDetailById(id);
  }

  @Get('/users/export/csv')
  @UseGuards(AdminGuard) // Then check admin access
  @ApiOperation({ summary: 'Export all users to CSV (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'CSV file containing all users',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required'
  })
  async exportUsersToCSV(
    @Query() query: GetUsersQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    // Remove page and limit for CSV export to get all users
    const { page, limit, ...queryWithoutPagination } = query;
    const result  = await this.userService.getAllUsers(queryWithoutPagination);
    // Generate CSV from users data
    const csvData = this.userService.generateUsersCSV(result.users);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="list-of-users.csv"');
    res.send(csvData);
  }


}
