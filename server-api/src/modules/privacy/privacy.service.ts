// privacy.service.ts
import { Injectable } from '@nestjs/common';
import { PrivacyRepository } from './privacy.repository';

import {PrivacySettingsDto} from './dtos/privacy.dto';

@Injectable()
export class PrivacyService {
  constructor(private readonly privacyRepository: PrivacyRepository) {}

  async getUserPrivacySettings(userId: string) {
    const settings = await this.privacyRepository.getOrCreateUserPrivacySettings(userId);
    if (!settings) {
      // Return default settings if none exist
      return {
        dataProcessing: false,
        newsletter: false,
        termsAccepted: false,
        privacyAccepted: false
      };
    }
    return settings;
  }

  async updatePrivacySettings(userId: string, settings: PrivacySettingsDto) {
    // You could add validation here if needed
    if (!settings.termsAccepted || !settings.privacyAccepted) {
      throw new Error('Terms and Privacy Policy must be accepted');
    }

    return this.privacyRepository.upsert(userId, settings);
  }
}
