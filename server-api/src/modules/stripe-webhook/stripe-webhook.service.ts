import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentService } from '../payment/payment.service';
import { StripeConnector } from '../../connectors/stripe.connector';

@Injectable()
export default class StripeWebhookService {
  constructor(private paymentService: PaymentService, private stripeConnector: StripeConnector) {}

  createEvent(id: string) {
    // return this.eventsRepository.insert({ id });
  }

  async processSubscriptionUpdate(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    if (
      subscription.cancel_at_period_end &&
      subscription.canceled_at &&
      event.data.previous_attributes &&
      (event.data.previous_attributes as any).cancel_at_period_end === false
    ) {
      // await this.subscriptionService.markAsPendingCancel(subscription.id, {
      //   userId: subscription.metadata.userId,
      //   cancelAt: subscription.cancel_at,
      //   canceledAt: subscription.canceled_at,
      // });
    }
  }
}
