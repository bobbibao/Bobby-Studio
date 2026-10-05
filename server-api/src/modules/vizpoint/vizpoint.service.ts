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
   * Returns the user's credit totals
   */
  async getUserVizPoints(userId: string): Promise<VizPointsDto> {
    return await this.vizPointsRepository.getUserVizPoints(userId);
  }



  /**
   * Monthly reset of free credits
   * Can be called from a cron job
   */
  async processMonthlyFreeCreditsReset(): Promise<void> {
    // Load the users whose free credits need a reset
    const usersToReset =
      await this.vizPointsRepository.getMonthlyFreeCreditsReset();

    // Reset free credits for each user
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
      // Load the team's members
      const teamAndMembers =
        await this.teamService.getOrCreateTeamMembersByOwner(userId);
      // Update credits for each user in the team
      for (const member of teamAndMembers.members) {
        await this.vizPointsRepository.updatePaidCredits(member.id, credit);
      }
    } else {
      // Outside a team, update the individual user
      await this.vizPointsRepository.updatePaidCredits(userId, credit);
    }
  }
}
