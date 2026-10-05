import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { VizPointsDto } from './dtos/VizPoints.dto';
import { User } from '@prisma/client';

@Injectable()
export class VizpointRepository {
  private readonly logger = new Logger(VizpointRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the user's current freeVizPoints and subscriptionVizPoints totals
   */
  async getUserVizPoints(userId: string): Promise<VizPointsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // const freeVizPoints = Math.max(0, user.freeCredit - user.usedFreeCredit);
    // const subscriptionVizPoints = Math.max(
    //   0,
    //   user.paidCredit - user.usedPaidCredit,
    // );

    return new VizPointsDto(
      user.freeCredit,
      user.paidCredit,
      user.usedFreeCredit ?? 0,
      user.usedPaidCredit ?? 0,
    );
  }


  async resetFreeCredits(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        usedFreeCredit: 0,
        freeCreditRenewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Reset after 30 days
      },
    });
  }

  async updatePaidCredits(
    userId: string,
    totalPaidCredits: number,
  ): Promise<void> {
    const ONE_MONTH_FROM_NOW = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        paidCredit: {
          increment: totalPaidCredits,
        },
        paidCreditRenewalAt: ONE_MONTH_FROM_NOW,
      },
    });
  }

  /**
   * Monthly reset of free credits
   * Can be called from a cron job
   */
  async getMonthlyFreeCreditsReset(): Promise<User[]> {
    // Load the users whose free credits need a reset
    const usersToReset = await this.prisma.user.findMany({
      where: {
        OR: [
          { freeCreditRenewalAt: { lte: new Date() } },
          { freeCreditRenewalAt: null },
        ],
      },
    });
    return usersToReset;
  }

}
