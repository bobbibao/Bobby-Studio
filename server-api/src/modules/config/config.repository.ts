import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  // todo: have to  it to favorite module later
  async findConfig(id) {
    return this.prisma.config.findFirst({
      where: {
        id
      },
    });
  }

  async addConfig(id, key, value) {
    return this.prisma.config.create({
      data: {
        id,
        configKey: key,
        configValue: value,
      },
    });
  }

  async removeConfig(id) {
    return this.prisma.config.deleteMany({
      where: {
        id,
      },
    });
  }

  async getConfigsByKey(configKey) {
    return this.prisma.config.findMany({
      where: { configKey }
    });
  }
}
