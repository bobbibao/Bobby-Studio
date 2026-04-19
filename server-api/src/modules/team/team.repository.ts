// src/teams/repositories/team.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Team, TeamMember, User } from '@prisma/client';
import { MemberRole } from '../../config/roles.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetTeamMembersResponseDto } from './dtos/get-team-members.dto';

@Injectable()
export class TeamRepository {
  constructor(private prisma: PrismaService) {}

  async createTeam(name: string, ownerId: string): Promise<Team> {
    // Kiểm tra xem ownerId đã có team chưa
    const existingTeam = await this.prisma.team.findFirst({
      where: { ownerId },
    });

    if (existingTeam) {
      throw new Error('Owner already has a team.');
    }

    // Nếu chưa có, mới tạo team
    return this.prisma.team.create({
      data: {
        name,
        ownerId,
      },
    });
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: MemberRole = MemberRole.MEMBER
  ): Promise<TeamMember> {
    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
    });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    return this.prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  async getTeamsAndMembersByOwnerId(
    ownerId: string,
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<PaginatedResponse<Team>> {
    const skip = (page - 1) * pageSize;
    const take = Number(pageSize);

    const whereCondition: any = {
      ownerId,
      members: userType
        ? {
            some: {
              role: userType, // Lọc theo cột `role` trong `TeamMember`
            },
          }
        : undefined, // Nếu `userType` không có thì lấy tất cả
    };

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where: whereCondition,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  createdAt: true,
                  updatedAt: true,
                  profileType: true,
                  role: true,
                  surveyCompletedAt: true,
                  language: true,
                  passwordUpdatedAt: true,
                },
              },
            },
          },
        },
        skip,
        take,
      }),
      this.prisma.team.count({ where: whereCondition }),
    ]);

    return {
      data: teams,
      total,
      page,
      pageSize,
      message: 'ok',
    };
  }

  async getTeamsAndMembersById(
    teamId: string,
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<PaginatedResponse<Team>> {
    const skip = (page - 1) * pageSize;
    const take = Number(pageSize);

    // Lấy thông tin team và danh sách thành viên có phân trang
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: userType ? { role: userType } : undefined, // Lọc theo userType nếu có
          include: {
            user: {
              select: {
                id: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                profileType: true,
                role: true,
                surveyCompletedAt: true,
                language: true,
                passwordUpdatedAt: true,
              },
            },
          },
          skip,
          take,
        },
      },
    });

    if (!team) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        message: 'Team not found',
      };
    }

    // Đếm tổng số thành viên của team (áp dụng bộ lọc userType nếu có)
    const totalMembers = await this.prisma.teamMember.count({
      where: {
        teamId,
        role: userType ? userType : undefined,
      },
    });

    return {
      data: [team], // Trả về mảng vì Team là duy nhất
      total: totalMembers,
      page,
      pageSize,
      message: 'ok',
    };
  }

  async getTeamsAndMembersByIds(
    teamIds: string[],
    page: number,
    pageSize: number,
    userType?: 'ADMIN' | 'MEMBER'
  ): Promise<PaginatedResponse<Team>> {
    const skip = (page - 1) * pageSize;
    const take = Number(pageSize);

    const [teams, totalMembers] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where: {
          id: { in: teamIds },
        },
        include: {
          members: {
            where: userType ? { role: userType } : undefined,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  createdAt: true,
                  updatedAt: true,
                  profileType: true,
                  role: true,
                  surveyCompletedAt: true,
                  language: true,
                  passwordUpdatedAt: true,
                },
              },
            },
            skip,
            take,
          },
        },
      }),
      this.prisma.teamMember.count({
        where: {
          teamId: { in: teamIds },
          role: userType || undefined,
        },
      }),
    ]);

    return {
      data: teams,
      total: totalMembers,
      page,
      pageSize,
      message: 'ok',
    };
  }


  async getTeamIdsByUserId(userId: string): Promise<string[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return memberships.map(m => m.teamId);
  }


  async getTeamByOwnerId(ownerId: string): Promise<Team | null> {
    return this.prisma.team.findFirst({
      where: { ownerId },
    });
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.prisma.teamMember.findMany({
      where: {
        teamId,
      },
      include: {
        user: true,
      },
    });
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: true,
        owner: true,
      },
    });
  }

  async getOrCreateTeamMembersByOwner(userId: string): Promise<GetTeamMembersResponseDto> {
    // Tìm team mà userId là owner
    let team = await this.prisma.team.findUnique({
      where: { ownerId: userId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Nếu chưa có team nào, tự động tạo
    if (!team) {
      team = await this.prisma.team.create({
        data: {
          name: `Team of ${userId}`,
          ownerId: userId,
          members: {
            create: {
              userId: userId,
              role: 'ADMIN',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        ownerId: team.ownerId,
      },
      members: team.members.map(member => ({
        id: member.user.id,
        email: member.user.email,
        role: member.user.role,
        createdAt: member.user.createdAt,
      })),
    };
  }

}
