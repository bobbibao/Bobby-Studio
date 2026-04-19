import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttributeModule } from '../attribute/attribute.module';
import { GoogleStrategy } from './google.strategy';
import { ConfigModule } from '../config/config.module';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { ResendService } from '../resend/resend.service';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
    forwardRef(() => AttributeModule),
    forwardRef(() => UserModule),
    forwardRef(() => RoleModule),
    forwardRef(() => EmailModule),
    forwardRef(() => ConfigModule),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    GoogleStrategy,
    ResendService,
    EmailService,
  ],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
