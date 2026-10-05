import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AttributeModule } from '../attribute/attribute.module';
import { ConfigModule } from '../config/config.module';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { ResendService } from '../resend/resend.service';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    forwardRef(() => AttributeModule),
    forwardRef(() => UserModule),
    forwardRef(() => RoleModule),
    forwardRef(() => EmailModule),
    forwardRef(() => ConfigModule),
  ],
  providers: [AuthService, ResendService, EmailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
