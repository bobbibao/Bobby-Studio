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

  /**
   * Checks whether the user has enough credit to generate an image
   */
  async hasEnoughVizPoints(userId: string, cost: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const freeVizPointsRemaining = user.freeCredit - user.usedFreeCredit;
    const subscriptionVizPointsRemaining =
      user.paidCredit - user.usedPaidCredit;

    return freeVizPointsRemaining + subscriptionVizPointsRemaining >= cost;
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

  /**
   * Deducts the user's credit, free credit first and paid credit after
   * Returns true when the deduction succeeds and false when credit is insufficient
   * @param userId The user id
   * @param amount The credit amount to deduct
   * @returns Whether the deduction succeeded
   */
  async consumeVizPoints(userId: string, amount: number): Promise<boolean> {
    // Use a transaction to keep the data consistent

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }
      // Compute the remaining credit of each kind
      const freeVizPointsRemaining = Math.max(
        0,
        user.freeCredit - user.usedFreeCredit,
      );
      const paidVizPointsRemaining = Math.max(
        0,
        user.paidCredit - user.usedPaidCredit,
      );

      // Total remaining credit
      const totalVizPointsRemaining =
        freeVizPointsRemaining + paidVizPointsRemaining;
      // Check whether the credit is sufficient
      if (totalVizPointsRemaining < amount) {
        return false; // Not enough credit to deduct
      }

      // Deduct free credit first
      const freeToConsume = Math.min(freeVizPointsRemaining, amount);
      const paidToConsume = Math.min(
        paidVizPointsRemaining,
        amount - freeToConsume,
      );

      const freeCreditAfterConsumption = user.usedFreeCredit + freeToConsume;
      const paidCreditAfterConsumption = user.usedPaidCredit + paidToConsume;
      // Update the data
      await tx.user.update({
        where: { id: userId },
        data: {
          usedFreeCredit: freeCreditAfterConsumption,
          usedPaidCredit: paidCreditAfterConsumption,
        },
      });

      // Record the credit usage history
      await tx.usage.create({
        data: {
          userId: userId,
          type: 'VIZ_POINTS',
          amount: amount,
          freeAmount: freeToConsume,
          paidAmount: paidToConsume,
          description: 'Generate image',
        },
      });

      return true; // Deduction succeeded
    });
  }
}
