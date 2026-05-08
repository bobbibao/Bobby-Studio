import { Controller, Get, UseGuards, Param, Request } from '@nestjs/common';
import { UsageService } from './usage.service';
import { AuthGuard } from '../auth/auth.guard';
import { UsageStatisticsDto } from './dtos/UsageStatistics.dto';

@Controller('usage')
@UseGuards(AuthGuard)
export class UsageController {
  constructor(private usageService: UsageService) {}

  @Get('stats')
  async getUsageStats(@Request() req) : Promise<UsageStatisticsDto> {
    const userId = req.currentUser.id;
    return this.usageService.getUsageStatistics(userId);
  }
}
