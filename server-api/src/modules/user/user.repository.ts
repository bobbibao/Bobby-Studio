import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserWithPermissions } from './types';
import { User, PersonalProfile, CompanyProfile, UserSurvey } from '@prisma/client';
import { CompanyProfileDTO, CreateNewUserDTO, CreateUserDTO, PersonalProfileDTO, Step, Survey, UserProfileDTO } from './dto';
import { removeUndefinedFields } from 'bullmq';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    return null;
  }

  async addPermission(userId: string, permissionId: string) {
    //
  }

  async getById(userId: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async createUser(createUserDTO: CreateUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...createUserDTO,
        // add missing fields
      },
    });
  }

  async createUserFromFirebase(createUserDTO: CreateNewUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...createUserDTO,
        // add missing fields
      },
    });
  }

  async findByEmail(email: string): Promise<User> {
    const result: User = await this.prisma.user.findFirst({
      where: { email },
    });
    return result;
  }

   async getAllUsers(query?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sort?: string;
    isActive?: string;
    isAdmin?: string;
    emailVerified?: string;
  }) {
    const page = query?.page !== undefined ? Number(query.page) : undefined;
    const limit = query?.limit !== undefined ? Number(query.limit) : undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;
    const sortParam = query?.sort || 'createdAt:desc';
    const sortParts = sortParam.split(',');
    const orderBy: any[] = [];
    // Build where clause
    const where: any = {};
    const validSortFields = ['createdAt', 'lastLogin', 'freeCredit', 'usedFreeCredit', 'paidCredit', 'usedPaidCredit'];
    const validSortDirections = ['asc', 'desc'];

    for (const part of sortParts) {
      const [sortField, sortDirection] = part.trim().split(':');
      if (validSortFields.includes(sortField) && validSortDirections.includes(sortDirection || 'desc')) {
        orderBy.push({ [sortField]: sortDirection || 'desc' });
      }
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === '1';
    }
    if (query?.isAdmin !== undefined) {
      where.isAdmin = query.isAdmin === 'true' || query.isAdmin === '1';
    }
    if (query?.emailVerified !== undefined) {
      where.emailVerified = query.emailVerified === 'true' || query.emailVerified === '1';
    }

    // Search by email
    if (query?.search) {
      where.email = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Filter by role
    if (query?.role) {
      switch (query.role) {
        case 'free':
          where.role = 'FREE';
          break;
        case 'basic':
          where.role = 'BASIC';
          break;
        case 'pro':
          where.role = 'PRO';
          break;
        case 'team':
          where.role = 'TEAM';
          break;
      }
    }

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get users with pagination
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        role: true,
        freeCredit: true,
        usedFreeCredit: true,
        paidCredit: true,
        usedPaidCredit: true,
        isActive: true,
        isAdmin: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        teamId: true,
      },
    });

    return {
      users,
      total,
      page: page || 1,
      limit: limit || total,
      totalPages: limit ? Math.ceil(total / limit) : 1,
    };
  }

  async addRoleToUser(userId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: roleId },
        },
      },
    });
  }

  async getPersonalProfile(userId: string): Promise<PersonalProfile> {
    return this.prisma.personalProfile.findUnique({
      where: { userId },
    });
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile> {
    return this.prisma.companyProfile.findUnique({
      where: { userId },
    });
  }

  async updatePersonalProfile(updatePersonalProfileDTO: UserProfileDTO<PersonalProfileDTO>) {
    const { userId, profile } = updatePersonalProfileDTO;
    return this.prisma.personalProfile.update({
      where: { userId: userId },
      data: {
        ...profile,
      },
    });
  }

  async updateCompanyProfile(updateCompanyProfileDTO: UserProfileDTO<CompanyProfileDTO>) {
    const { userId, profile } = updateCompanyProfileDTO;
    return this.prisma.companyProfile.update({
      where: { userId },
      data: {
        ...profile,
      },
    });
  }

  async createPersonalProfile(createPersonalProfileDTO: UserProfileDTO<PersonalProfileDTO>) {
    const { userId, profile } = createPersonalProfileDTO;
    return this.prisma.personalProfile.create({
      data: {
        userId,
        ...profile,
      },
    });
  }

  async createCompanyProfile(createCompanyProfileDTO: UserProfileDTO<CompanyProfileDTO>) {
    const { userId, profile } = createCompanyProfileDTO;
    return this.prisma.companyProfile.create({
      data: {
        userId,
        ...profile,
      },
    });
  }

  async getServey(userId: string): Promise<UserSurvey> {
    return this.prisma.userSurvey.findUnique({
      where: { userId: userId },
    });
  }

  async updateSurvey(userId: string, survey: Survey<Step>) {
    return this.prisma.userSurvey.update({
      where: { userId: userId },
      data: {
        survey: JSON.stringify(survey),
      },
    });
  }

  async markCompletedSurvey(userId: string, isCompleted: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        surveyCompletedAt: isCompleted ? new Date() : null,
      },
    });
  }

  async updateUserRole(userId: string, role: string): Promise<User | null> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
      });
      return updatedUser;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async checkPersonalProfileExists(userId: string): Promise<boolean> {
    const profile = await this.prisma.personalProfile.findUnique({
      where: { userId },
    });
    return !!profile;
  }

  async checkCompanyProfileExists(userId: string): Promise<boolean> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    return !!profile;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  async updateTeamId(userId: string, teamId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId },
    });
  }

  async updateLanguage(userId: string, language: string): Promise<User | null> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { language },
    });
  }

  async softDeleteUser(userId: string) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!user.isActive) {
        throw new BadRequestException('User already deleted');
      }
      return await this.prisma.user.update({
        where: { id: userId },
        data: { isActive:false,
          deactivatedAt: new Date()
         },
      });
    }

  async addImgPersonalInformation(userId:string,imgUrl:string){
    const result = await this.prisma.personalProfile.updateMany({
      where: { userId },
      data: { pictureProfile: imgUrl },
    });
  }

  async isUserActive(userId:string){
    const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
    return user.isActive;  
  }

  async updateAdminFields(
    userId: string,
    updates: {
      freeCredit?: number;
      paidCredit?: number;
      isAdmin?: boolean;
      isActive?: boolean;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};

    if (updates.freeCredit !== undefined) {
      data.freeCredit = updates.freeCredit;
    }

    if (updates.paidCredit !== undefined) {
      data.paidCredit = updates.paidCredit;
    }

    if (updates.isAdmin !== undefined) {
      data.isAdmin = updates.isAdmin;
    }

    if (updates.isActive !== undefined) {
      data.isActive = updates.isActive;
      if (updates.isActive === false) {
        data.deactivatedAt = new Date();
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified },
    });
  }

  async getEmailVerified(userId: string): Promise<boolean> {
    const user =  await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    return user.emailVerified;
  }
  
}
