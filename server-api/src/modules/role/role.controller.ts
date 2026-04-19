import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RoleService } from './role.service';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('/me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async get(@Request() req) {
    const userId = req.currentUser.id;
    return this.roleService.getUserDetails(userId);
  }
}
