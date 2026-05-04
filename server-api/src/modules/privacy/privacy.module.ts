import { Module, forwardRef } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrivacyRepository } from './privacy.repository';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  controllers: [PrivacyController],
  providers: [PrivacyService, PrismaService, PrivacyRepository],
  exports: [PrivacyService],
})
export class PrivacyModule {}
