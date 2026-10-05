import { Module, forwardRef } from '@nestjs/common';
import { UserSurveyService } from './user-survey.service';
import { UserSurveyController } from './user-survey.controller';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [HttpModule, forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  providers: [
    UserSurveyService,
  ],
  exports: [UserSurveyService],
  controllers: [UserSurveyController],
})
export class UserSurveyModule {}
