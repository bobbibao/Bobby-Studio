import { Module, forwardRef } from '@nestjs/common';
import { UserSurveyService } from './user-survey.service';
import { UserSurveyController } from './user-survey.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [HttpModule, forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  providers: [
    UserSurveyService,
    PrismaService,
  ],
  exports: [UserSurveyService],
  controllers: [UserSurveyController],
})
export class UserSurveyModule {}
