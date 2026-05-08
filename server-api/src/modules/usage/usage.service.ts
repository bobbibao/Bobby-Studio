import { Injectable } from '@nestjs/common';
import { UsageRepository } from './usage.repository';
import { UsageStatisticsDto } from './dtos/UsageStatistics.dto';
import { subMonths } from 'date-fns';

@Injectable()
export class UsageService {
  constructor(private readonly usageRepository: UsageRepository) {}

  async getUsageStatistics(userId: string): Promise<UsageStatisticsDto> {
    const now = new Date();

    // Lấy số lượng `Usage` trong tháng hiện tại
    const currentMonthUsage = await this.usageRepository.countUsageInMonth(userId, now);

    // Lấy số lượng `Usage` trong tháng trước
    const lastMonth = subMonths(now, 1);
    const lastMonthUsage = await this.usageRepository.countUsageInMonth(userId, lastMonth);

    // Tính phần trăm tăng trưởng
    let growthText = 'No usage this month';
    let growthPercentage = 0;

    if (currentMonthUsage > 0 && lastMonthUsage === 0) {
      growthText = 'Started using this month';
      growthPercentage = 100; // Nếu tháng trước không có usage, mặc định tăng 100%
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
      growthPercentage: parseFloat(growthPercentage.toFixed(2)), // Giữ tối đa 2 số thập phân
    };
  }
}
