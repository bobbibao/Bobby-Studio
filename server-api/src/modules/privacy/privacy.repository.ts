import { PrismaService } from '../../../prisma/prisma.service';
import { UserPrivacySettings } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUserPrivacySettings(
    userId: string,
  ): Promise<UserPrivacySettings> {
    const existing = await this.prisma.userPrivacySettings.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    const created = await this.prisma.userPrivacySettings.create({
      data: {
        userId,
        dataProcessing: false,
        newsletter: false,
        termsAccepted: false,
        privacyAccepted: false,
      },
    });

    return created;
  }

  async upsert(
    userId: string,
    data: {
      dataProcessing?: boolean;
      newsletter?: boolean;
      termsAccepted?: boolean;
      privacyAccepted: boolean;
    },
  ): Promise<UserPrivacySettings> {
    if (data.privacyAccepted !== true) {
      throw new Error('Privacy policy must be accepted.');
    }

    return this.prisma.userPrivacySettings.upsert({
      where: { userId },
      create: {
        userId,
        dataProcessing: data.dataProcessing ?? false,
        newsletter: data.newsletter ?? false,
        termsAccepted: data.termsAccepted ?? false,
        privacyAccepted: data.privacyAccepted,
      },
      update: {
        dataProcessing: data.dataProcessing ?? false,
        newsletter: data.newsletter ?? false,
        termsAccepted: data.termsAccepted ?? false,
        privacyAccepted: data.privacyAccepted,
      },
    });
  }
}
