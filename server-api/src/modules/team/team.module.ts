import { Module, forwardRef } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamRepository } from './team.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  controllers: [TeamController],
  providers: [
    TeamService,
    PrismaService,
    TeamRepository,
  ],
  exports: [TeamService, TeamRepository],
})
export class TeamModule {}
