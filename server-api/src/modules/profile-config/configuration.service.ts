import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigurationRepository } from './configuration.repository';
import { ConfigurationDto } from '../attribute/dto/configuration.dto';
import {
  defaultConfiguration,
  defaultAdminConfiguration,
} from '../../constant/default.configuration';
import { UserAttributeService } from '../attribute/user-attribute.service';
import {
  UserAttributeDto,
  UserAttributeEntity,
  UserAttributesDto,
} from '../attribute/dto/user-attribute.dto';
import { AttributeTypeEnum } from '../../constant/attribute-type.enum';
import { AttributeEntity } from '../attribute/dto/common.dto';
import { OriginalImageAttributeEntity } from '../attribute/dto/common.dto';
import { ActionEntity } from '../attribute/dto/common.dto';
import { AttributeVersion } from '@prisma/client';
import { AttributeService } from '../attribute/attribute.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configurationRepository: ConfigurationRepository,
    private readonly userAttributeService: UserAttributeService,
    private readonly attributeService: AttributeService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getConfiguration(userId: string) {
    return this.prisma.userConfigurations.findFirst({
      where: {
        userId,
      },
    });
  }

  async updateConfiguration(userId: string, key: string, value: string) {}

  // implement delete configuration
  async deleteConfiguration(userId: string) {
    return this.prisma.userConfigurations.deleteMany({
      where: { userId },
    });
  }

  // implement get configurations by user id
  async getConfigurationsByUserId(userId: string): Promise<ConfigurationDto> {
    const configuration =
      await this.configurationRepository.findConfigurationsByUserId(userId);
    return configuration;
  }

  async createConfiguration(
    userId: string,
    configuration: ConfigurationDto,
  ): Promise<ConfigurationDto> {
    const action: ActionEntity = {};
    const attr: AttributeEntity<ConfigurationDto, ActionEntity> = {
      type: AttributeTypeEnum.CONFIGURATION,
      value: configuration,
      actions: action,
    };
    const attributes: AttributeEntity<ConfigurationDto, ActionEntity>[] = [
      attr,
    ];
    const data: AttributeVersion[] =
      await this.attributeService.upsertAttributes(userId, attributes);
    const userAttributes: UserAttributesDto[] = data.map((a) => {
      const userAttribute: UserAttributesDto = {
        userId: userId,
        attributeId: a.id,
      };
      return userAttribute;
    });
    const assignedUserAttrs =
      await this.userAttributeService.assignAttributesToUser(userAttributes);
    return defaultConfiguration;
  }

  async createDefaultConfiguration(userId: string): Promise<ConfigurationDto> {
    const action: ActionEntity = {};
    const attr: AttributeEntity<ConfigurationDto, ActionEntity> = {
      type: AttributeTypeEnum.CONFIGURATION,
      value: defaultConfiguration,
      actions: action,
    };
    const attributes: AttributeEntity<ConfigurationDto, ActionEntity>[] = [
      attr,
    ];
    const data: AttributeVersion[] =
      await this.attributeService.upsertAttributes(userId, attributes);
    const userAttributes: UserAttributesDto[] = data.map((a) => {
      const userAttribute: UserAttributesDto = {
        userId: userId,
        attributeId: a.id,
      };
      return userAttribute;
    });
    const assignedUserAttrs =
      await this.userAttributeService.assignAttributesToUser(userAttributes);
    return defaultConfiguration;
  }

  async getUserConfigurations(
    userId: string,
    isAdmin?: boolean,
  ): Promise<ConfigurationDto> {
    const cacheKey = `user-config:${userId}:${isAdmin ? 'admin' : 'user'}`;

    // Check cache first
    let config = await this.cacheManager.get<ConfigurationDto>(cacheKey);
    if (config) {
      return config;
    }

    // Get from database/default
    if (isAdmin) {
      config = defaultAdminConfiguration;
    } else {
      config = defaultConfiguration;
    }

    // Cache for 10 minutes
    await this.cacheManager.set(cacheKey, config, 600000);
    return config;
  }
}
