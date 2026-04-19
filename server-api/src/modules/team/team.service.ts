// src/teams/services/team.service.ts
import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { Team, TeamMember } from '@prisma/client';
import { TeamRepository } from './team.repository';
import { MemberRole } from '../../config/roles.config';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';
import { GetTeamMembersResponseDto } from './dtos/get-team-members.dto';


@Injectable()
export class TeamService {
  private inviteSecret: string;
  constructor(
    private teamRepository: TeamRepository,
    @Inject(forwardRef(() => UserRepository))
    private userRepository: UserRepository
  ) {
    this.inviteSecret = process.env.INVITE_TEAM_SECRET;
  }

  async createTeamAndAdmin(name: string, ownerId: string): Promise<Team> {
    const team = await this.teamRepository.createTeam(name, ownerId);
    await this.userRepository.updateTeamId(ownerId, team.id);
    // Automatically add owner as an ADMIN member
    await this.teamRepository.addTeamMember(team.id, ownerId, MemberRole.ADMIN);
    return team;
  }

  async getTeamById(teamId: string): Promise<Team> {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found`);
    }
    return team;
  }

  async addMemberToTeam(
    teamId: string,
    userId: string,
    role: MemberRole = MemberRole.MEMBER,
  ): Promise<TeamMember> {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if user is already a member
    const existingMembers = await this.teamRepository.getTeamMembers(teamId);
    const isAlreadyMember = existingMembers.some(member => member.userId === userId);

    if (isAlreadyMember) {
      throw new ConflictException('User is already a team member');
    }

    return this.teamRepository.addTeamMember(teamId, userId, role);
  }

  async removeTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Prevent removing the owner
    if (team.ownerId === userId) {
      throw new ConflictException('Cannot remove the team owner');
    }

    return this.teamRepository.removeTeamMember(teamId, userId);
  }

  async getTeamsAndMembersByOwnerId(
    ownerId: string,
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<{ data: Team[]; total: number; page: number; pageSize: number }> {
    return this.teamRepository.getTeamsAndMembersByOwnerId(ownerId, page, pageSize, userType);
  }

  async getTeamsAndMembersById(
    teamId: string,
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<{ data: Team[]; total: number; page: number; pageSize: number }> {
    return this.teamRepository.getTeamsAndMembersById(teamId, page, pageSize, userType);
  }

  async getTeamIdsByUserId(userId: string): Promise<string[]> {
    return this.teamRepository.getTeamIdsByUserId(userId);
  }


  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.teamRepository.getTeamMembers(teamId);
  }

  async getTeamsAndMembersByIds(
    teamIds: string[],
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<{ data: Team[]; total: number; page: number; pageSize: number }> {
    return this.teamRepository.getTeamsAndMembersByIds(teamIds, page, pageSize, userType);
  }

  async getTeamByOwnerId(ownerId: string): Promise<Team> {
    const team = await this.teamRepository.getTeamByOwnerId(ownerId);
    if (!team) {
      throw new NotFoundException('Team not found for this owner');
    }
    return team;
  }


  // ✅ Tạo link invite có thời gian hết hạn
  generateInviteLink(teamId: string, userId: string) {
    const expiresIn = 60 * 60; // 1 giờ
    const token = jwt.sign(
      { teamId, inviterId: userId, exp: Math.floor(Date.now() / 1000) + expiresIn },
      this.inviteSecret
    );
    return { inviteLink: `team/invite/${token}` };
  }

  // ✅ Xác thực link invite
  validateInviteToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.inviteSecret) as { teamId: string; inviterId: string };
      return { valid: true, teamId: decoded.teamId };
    } catch (err) {
      return { valid: false, message: 'Invalid or expired invite link' };
    }
  }

  // ✅ Thêm user vào team khi họ bấm "Join"
  async joinTeamViaInvite(token: string, userId: string) {
    try {
      const decoded = jwt.verify(token, this.inviteSecret) as { teamId: string };
      const teamId = decoded.teamId;
      await this.userRepository.updateTeamId(userId, teamId);
      return this.addMemberToTeam(teamId, userId, MemberRole.MEMBER);
    } catch (err) {
      return false;
    }
  }

  async getOrCreateTeamMembersByOwner(userId: string): Promise<GetTeamMembersResponseDto> {
    return await this.teamRepository.getOrCreateTeamMembersByOwner(userId);
  }
}
