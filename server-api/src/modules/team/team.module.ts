import { Module, forwardRef } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamRepository } from './team.repository';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  controllers: [TeamController],
  providers: [
    TeamService,
    TeamRepository,
  ],
  exports: [TeamService, TeamRepository],
})
export class TeamModule {}
