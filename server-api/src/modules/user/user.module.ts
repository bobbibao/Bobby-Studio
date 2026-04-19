import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsageModule } from '../usage/usage.module';
import { UsageRepository } from '../usage/usage.repository';
import { UserController } from './user.controller';
import { RoleModule } from '../role/role.module';
import { AttributeModule } from '../attribute/attribute.module';

@Module({
  imports: [UsageModule, forwardRef(() => RoleModule), forwardRef(() => AttributeModule)],
  providers: [UserService, UserRepository, PrismaService, UsageRepository],
  exports: [UserService, UserRepository],
  controllers: [UserController],
})
export class UserModule {}
