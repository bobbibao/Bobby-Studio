import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';

@Module({
  providers: [ConfigService, ConfigRepository],
  exports: [ConfigService],
})
export class ConfigModule {}
