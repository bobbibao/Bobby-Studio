import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubscriptionController } from './subscription.controller';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';
import { VizpointModule } from '../vizpoint/vizpoint.module';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { NotificationModule } from '../notification/notification.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    forwardRef(() => UserModule),
    NotificationModule,
    VizpointModule,
    TeamModule,
  ],
  controllers: [SubscriptionController],
  providers: [PrismaService, VizpointService],
  exports: [],
})
export class SubscriptionModule {}
