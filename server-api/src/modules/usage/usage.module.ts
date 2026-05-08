import { Module, forwardRef } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageRepository } from './usage.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsageController } from './usage.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [UsageController],
  providers: [UsageService, UsageRepository, PrismaService],
  exports: [UsageService, UsageRepository],
})
export class UsageModule {}
