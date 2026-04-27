import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { VizPointsDto } from './dtos/VizPoints.dto';
import { User } from '@prisma/client';

@Injectable()
export class VizpointRepository {
  private readonly logger = new Logger(VizpointRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy ra tổng số freeVizPoints và subscriptionVizPoints hiện có của người dùng
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
   * Kiểm tra user có đủ credit để generate ảnh không
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
        freeCreditRenewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Đặt thời gian reset sau 30 ngày
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
   * Xử lý logic reset free credits hàng tháng
   * Có thể gọi từ một cronjob
   */
  async getMonthlyFreeCreditsReset(): Promise<User[]> {
    // Lấy danh sách user cần reset free credits
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
   * Trừ credit của user, ưu tiên free trước, paid sau
   * Trả về true nếu trừ thành công, false nếu không đủ credit
   * @param userId ID của người dùng
   * @param amount Số credit cần trừ
   * @returns Boolean cho biết trừ thành công hay không
   */
  async consumeVizPoints(userId: string, amount: number): Promise<boolean> {
    // Sử dụng transaction để đảm bảo tính nhất quán của dữ liệu

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }
      // Tính số credit còn lại của mỗi loại
      const freeVizPointsRemaining = Math.max(
        0,
        user.freeCredit - user.usedFreeCredit,
      );
      const paidVizPointsRemaining = Math.max(
        0,
        user.paidCredit - user.usedPaidCredit,
      );

      // Tổng số credit còn lại
      const totalVizPointsRemaining =
        freeVizPointsRemaining + paidVizPointsRemaining;
      // Kiểm tra xem có đủ credit không
      if (totalVizPointsRemaining < amount) {
        return false; // Không đủ credit để trừ
      }

      // Ưu tiên trừ free credit trước
      const freeToConsume = Math.min(freeVizPointsRemaining, amount);
      const paidToConsume = Math.min(
        paidVizPointsRemaining,
        amount - freeToConsume,
      );

      const freeCreditAfterConsumption = user.usedFreeCredit + freeToConsume;
      const paidCreditAfterConsumption = user.usedPaidCredit + paidToConsume;
      // Cập nhật dữ liệu
      await tx.user.update({
        where: { id: userId },
        data: {
          usedFreeCredit: freeCreditAfterConsumption,
          usedPaidCredit: paidCreditAfterConsumption,
        },
      });

      // Tạo lịch sử sử dụng credit
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

      return true; // Trừ credit thành công
    });
  }
}
