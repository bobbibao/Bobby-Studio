import {
  Controller,
  Request,
  UseGuards,
  Body,
  Get, Put
} from '@nestjs/common';
import {
  PrivacySettingsDto,
  PrivacySettingsResponseDto,
} from './dtos/privacy.dto';
import { PrivacyService } from './privacy.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('privacy-settings')
@UseGuards(AuthGuard)
export class PrivacyController {
  constructor(private privacyService: PrivacyService) {}

  @Put()
  async updatePrivacySettings(
    @Request() req,
    @Body() settings: PrivacySettingsDto
  ): Promise<PrivacySettingsResponseDto> {
    const userId = req.currentUser.id;
    return this.privacyService.updatePrivacySettings(userId, settings);
  }

  @Get()
  async getPrivacySettings(@Request() req) {
    const userId = req.currentUser.id;
    return this.privacyService.getUserPrivacySettings(userId);
  }
}
