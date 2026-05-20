import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  providers: [ConfigService, ConfigRepository, PrismaService],
  exports: [ConfigService],
})
export class ConfigModule {}
