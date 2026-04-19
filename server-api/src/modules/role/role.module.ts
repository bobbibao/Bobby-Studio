import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './role.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoleController } from './role.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { HttpModule } from '@nestjs/axios';
import { AttributeModule } from '../attribute/attribute.module';
import { PaymentModule } from '../payment/payment.module';
import { VizpointModule } from '../vizpoint/vizpoint.module';

@Module({
  imports: [
    AuthModule,
    HttpModule,
    forwardRef(() => AttributeModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => VizpointModule),
    forwardRef(() => UserModule),
  ],
  providers: [
    RoleService,
    PrismaService,
  ],
  exports: [RoleService],
  controllers: [RoleController],
})
export class RoleModule {}
