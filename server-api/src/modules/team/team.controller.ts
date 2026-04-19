import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  Query,
  NotFoundException,
  HttpException,
  HttpStatus, BadRequestException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dtos/create-team.dto';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PaginationDto } from '../../common/pagination.dto';
import { UserService } from '../user/user.service';
import { TEAM_USER_ROLE } from '../../config/roles.config';
import { Exception } from 'sass';
import { GetTeamMembersResponseDto } from './dtos/get-team-members.dto';

@ApiTags('teams')
@Controller('teams')
@UseGuards(AuthGuard)
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly userService: UserService
  ) {}

  @Get('my-teams')
  @ApiOperation({ summary: 'Get teams joined by current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of teams joined by user',
  })
  async getMyTeams(@Request() req, @Query() paginationDto: PaginationDto) {
    const { page = 1, pageSize = 10, userType } = paginationDto;
    const userId = req.currentUser.id;

    const teamIds = await this.teamService.getTeamIdsByUserId(userId);

    if (!teamIds.length) {
      throw new BadRequestException('You have not joined any team yet.');
    }

    return this.teamService.getTeamsAndMembersByIds(
      teamIds,
      page,
      pageSize,
      userType
    );
  }

  @Get(':teamId/members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({ status: 200, description: 'Returns list of team members' })
  async getTeamMembers(@Param('teamId') teamId: string) {
    return this.teamService.getTeamMembers(teamId);
  }

  @Post(':teamId/members')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({
    status: 201,
    description: 'Member successfully added to team',
  })
  async addTeamMember(
    @Request() req,
    @Param('teamId') teamId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto
  ) {
    // Verify if requester is team owner or admin
    const team = await this.teamService.getTeamById(teamId);
    const userId = req.currentUser.id;
    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only team owner can add members');
    }

    return this.teamService.addMemberToTeam(
      teamId,
      addTeamMemberDto.userId,
      addTeamMemberDto.role
    );
  }

  @Delete(':teamId/members/:userId')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({
    status: 200,
    description: 'Member successfully removed from team',
  })
  async removeTeamMember(
    @Request() req,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string
  ) {
    // Verify if requester is team owner
    const team = await this.teamService.getTeamById(teamId);
    if (team.ownerId !== req.currentUser.id) {
      throw new ForbiddenException('Only team owner can remove members');
    }

    return this.teamService.removeTeamMember(teamId, userId);
  }

  @Post('generate-invite-link')
  @ApiOperation({ summary: 'Generate an invite link' })
  @ApiResponse({ status: 201, description: 'Invite link generated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async generateInvite(@Request() req) {
    try {
      if (!req.currentUser) {
        throw new HttpException(
          { message: 'User not authenticated' },
          HttpStatus.UNAUTHORIZED
        );
      }

      const userId = req.currentUser.id;
      const team = await this.teamService.getTeamByOwnerId(userId);

      if (!team) {
        throw new HttpException(
          'Team not found for this user',
          HttpStatus.NOT_FOUND
        );
      }

      return await this.teamService.generateInviteLink(team.id, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate invite link',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/invite/:token')
  @ApiOperation({ summary: 'Validate an invite link' })
  @ApiResponse({ status: 200, description: 'Invite is valid' })
  async validateInvite(@Param('token') token: string) {
    return this.teamService.validateInviteToken(token);
  }

  @Post('/invite/:token/join')
  @ApiOperation({ summary: 'Join team via invite link' })
  @ApiResponse({
    status: 200,
    description: 'User successfully joined the team',
  })
  async joinTeam(@Request() req, @Param('token') token: string) {
    const userId = req.currentUser?.id;
    if (!userId) {
      throw new ForbiddenException('You must be logged in to join a team.');
    }

    const result = await this.teamService.joinTeamViaInvite(token, userId);
    if (!result) {
      throw new NotFoundException('Invalid or expired invite link');
    }

    return { message: 'Successfully joined the team!' };
  }
  //
  // @Get('members-v2')
  // @ApiOperation({ summary: 'Get team members where user is ADMIN' })
  // @ApiResponse({ status: 200, type: GetTeamMembersResponseDto })
  // async getTeamMembersByOwner(): Promise<GetTeamMembersResponseDto> {
  //   const userId = '0utKAqKfiwXQSpmbQCkKPFzkQEa2';
  //   return this.teamService.getTeamMembersByOwner(userId);
  // }
}
