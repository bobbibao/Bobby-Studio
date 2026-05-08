import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentConfigService } from './payment-config.service';
import { NotificationModule } from '../notification/notification.module';
import { VizpointModule } from '../vizpoint/vizpoint.module';
import { TeamModule } from '../team/team.module';
import { StripeConnector } from '../../connectors/stripe.connector';

@Module({
  imports: [
    forwardRef(() => UserModule),
    NotificationModule,
    forwardRef(() => SubscriptionModule),
    forwardRef(() => VizpointModule),
    TeamModule,
  ],
  providers: [
    PaymentService,
    StripeConnector,
    PaymentConfigService,
  ],
  exports: [PaymentService, StripeConnector, PaymentConfigService],
})
export class PaymentModule {}
