import { Inject, Injectable } from '@nestjs/common';
import { User, PersonalProfile, CompanyProfile } from '@prisma/client';
import { UserRepository } from './user.repository';
import {
  CompanyProfileDTO,
  CreateNewUserDTO,
  CreateUserDTO,
  PersonalProfileDTO,
  Step,
  Survey,
  UserProfileDTO,
} from './dto';
import { RoleService } from '../role/role.service';
import { VizPointsDto } from '../vizpoint/dtos/VizPoints.dto';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private roleService: RoleService,
  ) {}

  async getUserWithPermissions(userId: string) {
    return this.userRepository.findUserWithPermissions(userId);
  }

  async addPermissionToUser(userId: string, permissionId: string) {
    // Implement the logic to add a permission to a user
    return this.userRepository.addPermission(userId, permissionId);
  }

  async createUser(createUserDTO: CreateUserDTO) {
    return this.userRepository.createUser(createUserDTO);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findByEmail(email);
  }

  async getById(userId: string): Promise<User> {
    return this.userRepository.getById(userId);
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
    return this.userRepository.getAllUsers(query);
  }

  async addRoleToUser(userId: string, roleName: string) {
    const role = await this.roleService.getRoleByName(roleName);
    if (role) {
      await this.userRepository.addRoleToUser(userId, role.id);
    }
  }

  // implement getUserProfle with id
  //TODO

  async createPersonalProfile(
    createPersonalProfileDTO: UserProfileDTO<PersonalProfileDTO>,
  ) {
    return this.userRepository.createPersonalProfile(createPersonalProfileDTO);
  }

  async createCompanyProfile(
    createCompanyProfileDTO: UserProfileDTO<CompanyProfileDTO>,
  ) {
    return this.userRepository.createCompanyProfile(createCompanyProfileDTO);
  }

  async getPersonalProfile(userId: string): Promise<PersonalProfile> {
    return this.userRepository.getPersonalProfile(userId);
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile> {
    return this.userRepository.getCompanyProfile(userId);
  }

  async updatePersonalProfile(
    updatePersonalProfileDTO: UserProfileDTO<PersonalProfileDTO>,
  ) {
    return this.userRepository.updatePersonalProfile(updatePersonalProfileDTO);
  }

  async checkPersonalProfileExists(userId: string): Promise<boolean> {
    return this.userRepository.checkPersonalProfileExists(userId);
  }

  async checkCompanyProfileExists(userId: string): Promise<boolean> {
    return this.userRepository.checkCompanyProfileExists(userId);
  }

  async updateCompanyProfile(
    updateCompanyProfileDTO: UserProfileDTO<CompanyProfileDTO>,
  ) {
    return this.userRepository.updateCompanyProfile(updateCompanyProfileDTO);
  }

  async getServeys(userId: string): Promise<Survey<Step>> {
    const { survey } = await this.userRepository.getServey(userId);
    const data: Survey<Step> = JSON.parse(survey as string);
    return data;
  }

  async doServey(userId: string, survey: Survey<Step>) {
    return this.userRepository.updateSurvey(userId, survey);
  }

  async createUserFromFirebase(
    createNewUserDTO: CreateNewUserDTO,
  ): Promise<User> {
    const { id, email, password, role, freeCreditRenewalAt } = createNewUserDTO;
    const user = await this.userRepository.createUserFromFirebase({
      id,
      email,
      password,
      role,
      freeCreditRenewalAt,
    });
    return user;
  }

  async markCompletedSurvey(userId: string, isCompleted: boolean) {
    return await this.userRepository.markCompletedSurvey(userId, isCompleted);
  }

  async changeUserRole(userId: string, newRole: string) {
    return this.userRepository.updateUserRole(userId, newRole);
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string) {
    return this.userRepository.updateStripeCustomerId(userId, stripeCustomerId);
  }

  async updateUserLanguage(userId: string, language: string) {
    return this.userRepository.updateLanguage(userId, language);
  }

  async softDeleteUser(userId:string){
    return this.userRepository.softDeleteUser(userId)
  }

  async addImgPersonalInformation(userId:string,imgUrl:string){
    return this.userRepository.addImgPersonalInformation(userId,imgUrl)
  }

  async isUserActive(userId: string){
    return this.userRepository.isUserActive(userId);
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
    return this.userRepository.updateAdminFields(userId, updates);
  }
  async updateEmailVerified(userId: string, emailVerified: boolean) {
    return this.userRepository.updateEmailVerified(userId, emailVerified);
  }

  generateUsersCSV(users: any[]): string {
    const headers = [
      'ID',
      'Email',
      'Role',
      'Free Credit',
      'Used Free Credit',
      'Paid Credit',
      'Used Paid Credit',
      'Is Active',
      'Is Admin',
      'Email Verified',
      'Last Login',
      'Created At',
      'Team ID'
    ];

    const csvRows = [headers.join(',')];

    for (const user of users) {
      const row = [
        this.escapeCSV(user.id),
        this.escapeCSV(user.email),
        this.escapeCSV(user.role),
        user.freeCredit?.toString() || '',
        user.usedFreeCredit?.toString() || '',
        user.paidCredit?.toString() || '',
        user.usedPaidCredit?.toString() || '',
        user.isActive?.toString() || '',
        user.isAdmin?.toString() || '',
        user.emailVerified?.toString() || '',
        user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
        user.createdAt ? new Date(user.createdAt).toISOString() : '',
        this.escapeCSV(user.teamId || '')
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value == null) return '';
    const stringValue = String(value);
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  }
}
