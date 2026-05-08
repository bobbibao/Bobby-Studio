import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // async createUsageRecord(userId: string, input: any, output: any) {
  //   return await this.prisma.usage.create({
  //     data: {
  //       userId,
  //       input,
  //       output,
  //     },
  //   });
  // }

  async countUsageInMonth(userId: string, date: Date): Promise<number> {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return this.prisma.usage.count({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }
}
