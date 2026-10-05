import { Injectable } from '@nestjs/common';
import { UsageRepository } from './usage.repository';
import { UsageStatisticsDto } from './dtos/UsageStatistics.dto';
import { subMonths } from 'date-fns';

@Injectable()
export class UsageService {
  constructor(private readonly usageRepository: UsageRepository) {}

  async getUsageStatistics(userId: string): Promise<UsageStatisticsDto> {
    const now = new Date();

    // Count `Usage` rows in the current month
    const currentMonthUsage = await this.usageRepository.countUsageInMonth(userId, now);

    // Count `Usage` rows in the previous month
    const lastMonth = subMonths(now, 1);
    const lastMonthUsage = await this.usageRepository.countUsageInMonth(userId, lastMonth);

    // Compute the growth percentage
    let growthText = 'No usage this month';
    let growthPercentage = 0;

    if (currentMonthUsage > 0 && lastMonthUsage === 0) {
      growthText = 'Started using this month';
      growthPercentage = 100; // With no usage last month, growth defaults to 100%
    } else if (lastMonthUsage > 0) {
      growthPercentage = ((currentMonthUsage - lastMonthUsage) / lastMonthUsage) * 100;
      if (growthPercentage > 0) {
        growthText = `Increased by ${growthPercentage.toFixed(0)}% from last month`;
      } else if (growthPercentage < 0) {
        growthText = `Decreased by ${Math.abs(growthPercentage).toFixed(0)}% from last month`;
      } else {
        growthText = `No change from last month`;
      }
    }

    return {
      generatedImages: currentMonthUsage,
      growthText,
      growthPercentage: parseFloat(growthPercentage.toFixed(2)), // Keep at most two decimals
    };
  }
}
