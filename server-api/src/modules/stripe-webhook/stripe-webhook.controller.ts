import { Controller, Req, Post, Headers, BadRequestException } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import RequestWithRawBody from './requestWithRawBody.interface';
import StripeWebhookService from './stripe-webhook.service';

@Controller('webhook')
export class StripeWebhookController {
  constructor(private readonly paymentService: PaymentService, private readonly stripeWebhookService: StripeWebhookService) {}

  @Post()
  async handleIncomingEvents(@Headers('stripe-signature') signature: string, @Req() request: RequestWithRawBody) {
    if (!signature) {
      console.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      console.error('Missing raw body');
      throw new BadRequestException('Missing raw body');
    }

    let event;
    try {
      event = await this.paymentService.constructEventFromPayload(signature, request.rawBody);
    } catch (error) {
      console.error('❌ Webhook verification failed:', error.message);
      throw new BadRequestException(`Invalid Stripe event: ${error.message}`);
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const paymentResult = await this.paymentService.paymentSucceeded(event);
          return paymentResult;
        }

        case 'checkout.session.completed':
          return { ok: true };

        case 'invoice.payment_failed':
          return { ok: true };

        case 'customer.subscription.deleted':
          return { ok: true };
        case 'customer.subscription.updated': {
          const updateResult = await this.paymentService.paymentCustomerSubscriptionUpdated(event);
          return updateResult;
        }

        default:
          return { ok: true };
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      return { ok: false, error: error.message };
    }
  }
}
