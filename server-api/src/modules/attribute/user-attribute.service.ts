import { Injectable } from '@nestjs/common';
import { UserAttributeRepository } from './user-attribute.repository';
import { UserAttributesDto } from './dto/user-attribute.dto';
import { UserAttribute } from '@prisma/client';

@Injectable()
export class UserAttributeService {
  constructor(
    private readonly userAttributeRepository: UserAttributeRepository,
  ) {}

  async assignAttributesToUser(userAttributesDto: UserAttributesDto[]): Promise<UserAttribute[]> {
    return this.userAttributeRepository.bulkUpsertUserAttributes(userAttributesDto);
  }

  async getUserAttributes(userId: string) {
    return this.userAttributeRepository.getUserAttributesByUserId(userId);
  }

  async deleteUserAttribute(userId: string, attributeId: string) {
    return this.userAttributeRepository.deleteUserAttribute(userId, attributeId);
  }

} 