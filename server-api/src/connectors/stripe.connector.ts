import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateSubscriptionSessionDto } from '../modules/payment/dtos/CreateSubscriptionSessionDto';
import { User } from '@prisma/client';
import * as NodeCache from 'node-cache';

@Injectable()
export class StripeConnector {
  private stripe?: Stripe;
  private readonly enabled: boolean;
  private readonly logger = new Logger(StripeConnector.name);
  private readonly priceCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_API_KEY');
    this.enabled = Boolean(apiKey && apiKey.trim().length > 0);

    if (!this.enabled) {
      this.logger.warn(
        'STRIPE_API_KEY is not set. Stripe features are disabled for this environment.',
      );
      return;
    }

    this.stripe = new Stripe(apiKey);
    this.logger.log('StripeConnector initialized with API version 2023-10-16');
  }

  private requireStripe(): Stripe {
    if (!this.enabled || !this.stripe) {
      throw new Error('Stripe is not configured for this environment');
    }
    return this.stripe;
  }

  // Customer operations
  async createCustomer(email: string): Promise<Stripe.Customer> {
    return await this.requireStripe().customers.create({ email });
  }

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    return await this.requireStripe().customers.update(customerId, params);
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    return (await this.requireStripe().customers.retrieve(
      customerId,
    )) as Stripe.Customer;
  }

  // Payment Method operations
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    return await this.requireStripe().paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async listPaymentMethods(
    customerId: string,
    type: 'card' = 'card',
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    return await this.requireStripe().paymentMethods.list({
      customer: customerId,
      type,
    });
  }

  // Subscription operations
  async createSubscription(
    params: Stripe.SubscriptionCreateParams,
  ): Promise<Stripe.Subscription> {
    return await this.requireStripe().subscriptions.create(params);
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return await this.requireStripe().subscriptions.retrieve(subscriptionId);
  }

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    return await this.requireStripe().subscriptions.update(subscriptionId, params);
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return await this.requireStripe().subscriptions.cancel(subscriptionId);
  }

  async listSubscriptions(
    params: Stripe.SubscriptionListParams,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return await this.requireStripe().subscriptions.list(params);
  }

  // Price operations
  async retrievePrice(priceId: string): Promise<Stripe.Price> {
    // Check cache first
    const cachedPrice = this.priceCache.get<Stripe.Price>(priceId);
    if (cachedPrice) {
      return cachedPrice;
    }

    const price = await this.requireStripe().prices.retrieve(priceId);

    // Cache the price if it's active
    if (price.active) {
      this.priceCache.set(priceId, price);
    }

    return price;
  }

  async listPrices(
    params?: Stripe.PriceListParams,
  ): Promise<Stripe.ApiList<Stripe.Price>> {
    return await this.requireStripe().prices.list(params);
  }

  // Product operations
  async retrieveProduct(productId: string): Promise<Stripe.Product> {
    return await this.requireStripe().products.retrieve(productId);
  }

  // Invoice operations
  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.requireStripe().invoices.retrieve(invoiceId);
  }

  async listInvoices(
    params: Stripe.InvoiceListParams,
  ): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return await this.requireStripe().invoices.list(params);
  }

  // Checkout Session operations
  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    return await this.requireStripe().checkout.sessions.create(params);
  }

  // Webhook operations
  async constructEventFromPayload(
    signature: string,
    payload: Buffer,
    webhookSecret: string,
  ): Promise<Stripe.Event> {
    return this.requireStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  // Batch price retrieval with caching
  async retrievePrices(priceIds: string[]): Promise<Stripe.Price[]> {
    return await Promise.all(
      priceIds.map(async (priceId) => {
        try {
          return await this.retrievePrice(priceId);
        } catch (error) {
          this.logger.error(`Error retrieving price ${priceId}:`, error);
          return null;
        }
      }),
    ).then((prices) => prices.filter(Boolean));
  }

  // Helper method to check if customer has default payment method
  async hasDefaultPaymentMethod(
    customerId: string,
  ): Promise<string | Stripe.PaymentMethod | null> {
    try {
      const customer = await this.retrieveCustomer(customerId);
      if (customer && 'invoice_settings' in customer) {
        return customer.invoice_settings.default_payment_method;
      }
      return null;
    } catch (error) {
      this.logger.error('Error checking payment method:', error);
      return null;
    }
  }
}
