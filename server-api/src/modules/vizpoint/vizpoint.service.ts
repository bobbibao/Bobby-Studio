import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { VizPointsDto } from './dtos/VizPoints.dto';
import { UserService } from '../user/user.service';
import { VizpointRepository } from './vizpoint.repository';
import { TEAM_USER_ROLE } from '../../config/roles.config';
import { TeamService } from '../team/team.service';

@Injectable()
export class VizpointService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly vizPointsRepository: VizpointRepository,
    private readonly teamService: TeamService,
  ) {}

  /**
   * Lấy thông tin tổng số credits của user
   */
  async getUserVizPoints(userId: string): Promise<VizPointsDto> {
    return await this.vizPointsRepository.getUserVizPoints(userId);
  }

  /**
   * Kiểm tra user có đủ credits không
   */
  async hasEnoughVizPoints(userId: string, cost = 1): Promise<boolean> {
    return this.vizPointsRepository.hasEnoughVizPoints(userId, cost);
  }

  /**
   * Trừ credits khi user generate ảnh
   */
  async consumeVizPoints(userId: string, amount = 1): Promise<boolean> {
    return this.vizPointsRepository.consumeVizPoints(userId, amount);
  }

  /**
   * Xử lý logic reset free credits hàng tháng
   * Có thể gọi từ một cronjob
   */
  async processMonthlyFreeCreditsReset(): Promise<void> {
    // Lấy danh sách user cần reset free credits
    const usersToReset =
      await this.vizPointsRepository.getMonthlyFreeCreditsReset();

    // Reset free credits cho từng user
    for (const user of usersToReset) {
      await this.vizPointsRepository.resetFreeCredits(user.id);
    }
  }

  async handleSubscriptionRenewal(
    userId: string,
    plan: string,
    credit: number,
  ): Promise<void> {
    if (credit < 0) {
      throw new BadRequestException('Credit must be greater than 0');
    }
    if (plan === TEAM_USER_ROLE) {
      // Lấy danh sách thành viên của team
      const teamAndMembers =
        await this.teamService.getOrCreateTeamMembersByOwner(userId);
      // Cập nhật credits cho từng user trong team
      for (const member of teamAndMembers.members) {
        await this.vizPointsRepository.updatePaidCredits(member.id, credit);
      }
    } else {
      // Nếu không phải team, cập nhật cho user cá nhân
      await this.vizPointsRepository.updatePaidCredits(userId, credit);
    }
  }
}
