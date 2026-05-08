import { Module } from '@nestjs/common';
import StripeWebhookService from './stripe-webhook.service';
import { PaymentModule } from '../payment/payment.module';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PaymentModule],
  controllers: [StripeWebhookController],
  providers: [StripeWebhookService],
  exports: [StripeWebhookService],
})
export class StripeWebhookModule {}
