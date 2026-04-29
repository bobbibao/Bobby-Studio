import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserAttribute } from '@prisma/client';
import { UserAttributeDto, UserAttributesDto } from './dto/user-attribute.dto';

@Injectable()
export class UserAttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUserAttribute(data: UserAttributeDto) {
    return this.prisma.userAttribute.create({
      data: {
        userId: data.userId,
        attributeId: data.attributeId,
      },
    });
  }

  async getUserAttributesByUserId(userId: string) {
    return this.prisma.userAttribute.findMany({
      where: { userId },
    });
  }

  async deleteUserAttribute(userId: string, attributeId: string) {
    return this.prisma.userAttribute.deleteMany({
      where: {
        userId,
        attributeId,
      },
    });
  }
  // async bulkUpsertUserAttributes(userAttributes: UserAttributesDto[]): Promise<UserAttribute[]> {
  //   const userAttributesJson = JSON.stringify(userAttributes)
  //   return await this.prisma.$queryRaw`
  //     SELECT * FROM bulk_upsert_user_attributes(${userAttributesJson}::jsonb)
  //   `;
  // }
  async bulkUpsertUserAttributes(userAttributes: UserAttributesDto[]): Promise<{ userId: string; attributeId: string; }[]> {
    const successfulAttributes = []; // Array to hold successfully processed attributes
  
    // Process each user attribute in the array
    for (const item of userAttributes) {
      try {
        // Use upsert to handle conflicts
        await this.prisma.userAttribute.upsert({
          where: {
            userId_attributeId: {
              userId: item.userId,
              attributeId: item.attributeId,
            },
          },
          update: {}, // Do nothing on conflict (same as DO NOTHING)
          create: {
            userId: item.userId,
            attributeId: item.attributeId,
          },
        });
  
        successfulAttributes.push({ userId: item.userId, attributeId: item.attributeId }); // Add to successful attributes
      } catch (error) {
        console.warn(`Error inserting record: ${JSON.stringify(item)} - ${error.message}`);
      }
    }
  
    return successfulAttributes; // Return the array of successful attributes
  }
} 
