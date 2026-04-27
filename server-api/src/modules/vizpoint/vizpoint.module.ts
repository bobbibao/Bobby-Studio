import { Module, forwardRef } from '@nestjs/common';
import { VizpointController } from './vizpoint.controller';
import { VizpointRepository } from './vizpoint.repository';
import { VizpointService } from './vizpoint.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TeamModule, forwardRef(() => UserModule)],
  controllers: [VizpointController],
  providers: [
    VizpointService,
    PrismaService,
    VizpointRepository,
  ],
  exports: [VizpointService, VizpointRepository],
})
export class VizpointModule {}
