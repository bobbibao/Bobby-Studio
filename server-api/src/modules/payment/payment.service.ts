import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import Stripe from 'stripe';
import { CreateSubscriptionSessionDto } from './dtos/CreateSubscriptionSessionDto';
import { UserService } from '../user/user.service';

import {
  BASIC_USER_ROLE,
  PRO_USER_ROLE,
  DEFAULT_USER_ROLE,
  TEAM_USER_ROLE,
  FREE_USER_ROLE,
} from '../../config/roles.config';
import { SubscriptionResponseDto } from '../subscription/dtos/SubscriptionResponseDto';
import { User } from '@prisma/client';

import {
  BillingCycle,
  PlanType,
  PaymentConfigService,
} from './payment-config.service';
import { NotificationService } from '../notification/notification.service';
import {
  priceFeaturesMapping,
  PaymentPricingResponseDTO,
} from './dtos/PaymentPricingResponse.dto';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { UpgradeSubscriptionResponseDto } from '../subscription/dtos/UpgradeSubscriptionResponseDto';
import {
  BillingHistoryItem,
  BillingHistoryResponse,
} from './dtos/PaymentBillingDto';
import { PaymentSubscriptionDTO } from './dtos/PaymentSubscriptionDTO';
import { StripeConnector } from '../../connectors/stripe.connector';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly stripeConnector: StripeConnector,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly stripeConfigService: PaymentConfigService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => VizpointService))
    private readonly vizpointService: VizpointService,
  ) {
    this.logger.log('PaymentService initialized');
  }

  async createSubscription(
    userId: string,
    stripeCustomerId: string,
    paymentMethodId: string,
    priceId: string,
  ): Promise<SubscriptionResponseDto> {
    // 1️⃣ Attach payment method to customer
    await this.stripeConnector.attachPaymentMethod(
      paymentMethodId,
      stripeCustomerId,
    );

    // 2️⃣ Set Payment Method as default for customer
    await this.stripeConnector.updateCustomer(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3️⃣ Create subscription via Stripe API
    const subscription = await this.stripeConnector.createSubscription({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
      },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      customer: subscription.customer as string,
    };
  }

  async getPrices(currentPlanPriceId?: string): Promise<{
    monthly: PaymentPricingResponseDTO[];
    yearly: PaymentPricingResponseDTO[];
  }> {
    const priceIdMap: Record<BillingCycle, Record<PlanType, string>> = this
      .stripeConfigService.priceIdMap;

    const allPriceIds = [
      ...Object.values(priceIdMap.monthly),
      ...Object.values(priceIdMap.yearly),
    ].filter(Boolean);
    // Use connector to retrieve prices with caching
    const allowedPrices: Stripe.Price[] =
      await this.stripeConnector.retrievePrices(allPriceIds);
    const enrichPrice = async (
      price: Stripe.Price,
    ): Promise<
      PaymentPricingResponseDTO & { interval: 'monthly' | 'yearly' }
    > => {
      const productDetails =
        typeof price.product === 'string'
          ? await this.stripeConnector.retrieveProduct(price.product)
          : price.product;

      const plan =
        Object.entries(priceIdMap.monthly).find(
          ([, id]) => id === price.id,
        )?.[0] ||
        Object.entries(priceIdMap.yearly).find(
          ([, id]) => id === price.id,
        )?.[0] ||
        'UNKNOWN';

      const interval = Object.values(priceIdMap.monthly).includes(price.id)
        ? 'monthly'
        : Object.values(priceIdMap.yearly).includes(price.id)
          ? 'yearly'
          : 'monthly';

      const featureKey = `${plan.toLowerCase()}-${interval}`;
      const features = priceFeaturesMapping[featureKey] || [];

      return {
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        product: productDetails,
        productName:
          'name' in productDetails ? productDetails.name : 'Deleted Product',
        productDescription:
          'description' in productDetails ? productDetails.description : null,
        currentPlan: price.id === currentPlanPriceId,
        plan,
        interval,
        features,
      };
    };

    const pricesWithDetails = await Promise.all(allowedPrices.map(enrichPrice));

    const orderMap: Record<string, number> = {
      [FREE_USER_ROLE]: 1,
      [BASIC_USER_ROLE]: 2,
      [PRO_USER_ROLE]: 3,
    };

    return {
      monthly: pricesWithDetails
        .filter((p) => p.interval === 'monthly')
        .sort((a, b) => (orderMap[a.plan] || 999) - (orderMap[b.plan] || 999)),
      yearly: pricesWithDetails
        .filter((p) => p.interval === 'yearly')
        .sort((a, b) => (orderMap[a.plan] || 999) - (orderMap[b.plan] || 999)),
    };
  }

  async createSubscriptionSession(
    user: User,
    data: CreateSubscriptionSessionDto,
  ) {
    try {
      const session = await this.stripeConnector.createCheckoutSession({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: user.stripeCustomerId,
        line_items: [
          {
            price: data.priceId,
            quantity: 1,
          },
        ],
        success_url: this.stripeConfigService.successUrl,
        cancel_url: this.stripeConfigService.cancelUrl,
        subscription_data: {
          metadata: {
            userId: user.id,
          },
        },
      });
      return session;
    } catch (e) {
      console.error('Stripe subscription session creation failed:', e);
      throw new Error('Unable to create subscription session');
    }
  }

  public async constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.stripeConfigService.webhookSecret;
    return this.stripeConnector.constructEventFromPayload(
      signature,
      payload,
      webhookSecret,
    );
  }

  async paymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent) {
    const invoice = event.data.object;
    let subscriptionId = invoice.subscription;
    this.logger.log(`Processing payment succeeded for invoice: ${invoice.id}`);

    // If subscription ID is not directly available, try to find it through customer
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      this.logger.warn(
        `Subscription ID not found in invoice ${invoice.id}, attempting to find via customer`,
      );

      try {
        const customerId = invoice.customer;
        if (customerId && typeof customerId === 'string') {
          const subscriptions = await this.stripeConnector.listSubscriptions({
            customer: customerId,
            status: 'all',
            limit: 10,
          });

          // Find the most recent active subscription
          const activeSubscription = subscriptions.data.find(
            (sub) => sub.status === 'active' || sub.status === 'trialing',
          );

          if (activeSubscription) {
            subscriptionId = activeSubscription.id;
            this.logger.log(
              `Found subscription ${subscriptionId} for customer ${customerId}`,
            );
          }
        }
      } catch (error) {
        this.logger.error('Error finding subscription via customer:', error);
      }
    }
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      this.logger.error('Invalid or missing subscription ID in invoice:', {
        invoiceId: invoice.id,
        subscriptionId,
        billing_reason: invoice.billing_reason,
        customerId: invoice.customer,
      });
      return { ok: false, error: 'Invalid or missing subscription ID' };
    }
    try {
      const subscription =
        await this.stripeConnector.retrieveSubscription(subscriptionId);
      const { userId } = subscription.metadata;
      if (!userId) {
        this.logger.error(
          `No userId found in subscription metadata for subscription ${subscriptionId}`,
        );
        return { ok: false, error: 'No userId in subscription metadata' };
      }

      this.logger.log(
        `Processing subscription ${subscriptionId} for user ${userId}`,
      );

      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) {
        this.logger.error(
          `No price ID found in subscription ${subscriptionId}`,
        );
        return { ok: false, error: 'No price ID found in subscription' };
      }

      const plan = this.getPlanFromPrice(priceId);
      if (!plan) {
        this.logger.warn(`Price ID ${priceId} does not match any known plans`);
        return { ok: false, error: 'Unknown plan' };
      }

      const currentUser = await this.userService.getById(userId);
      if (!currentUser) {
        this.logger.error(`User ${userId} not found`);
        return { ok: false, error: 'User not found' };
      }
      // Get credit amount for the plan
      const credit =
        this.stripeConfigService.getMonthlyCreditByPriceId(priceId);
      this.logger.log(
        `Granting ${credit} credits to user ${userId} for plan ${plan}`,
      );
      // Handle subscription renewal and role update

      await this.vizpointService.handleSubscriptionRenewal(
        userId,
        plan,
        credit,
      );

      if (currentUser.role === plan) {
        this.logger.log(
          `User ${userId} already has role ${plan}, no changes needed`,
        );
        return { ok: true, message: 'User already on this plan' };
      }


      await this.userService.changeUserRole(userId, plan);

      this.logger.log(`User ${userId} upgraded to role ${plan}`);

      // Send notification
      await this.notificationService.createNotification(
        userId,
        'Payment Successful',
        `Your payment for the ${plan} plan was successful. Thank you for your subscription! 🎉`,
        'payment_successful',
      );

      this.logger.log(`User ${userId} upgraded to role ${plan} and notified`);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing payment succeeded:', error);
      return { ok: false, error: error.message || 'Error processing payment' };
    }
  }

  async paymentCustomerSubscriptionUpdated(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
  ) {
    // get subscription from payment
    const subscription = event.data.object as Stripe.Subscription;
    const { userId } = subscription.metadata;

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = this.getPlanFromPrice(priceId);
    if (!plan) {
      console.warn(
        `Price ID ${subscription.items.data[0]?.price?.id} does not match any known plans.`,
      );
      return { ok: false, error: 'Unknown plan' };
    }
    const currentUser = await this.userService.getById(userId);
    if (!currentUser) return { ok: false, error: 'User not found' };
    if (currentUser.role === plan) {
      this.logger.log(
        `User ${userId} already has role ${plan}, no changes needed.`,
      );
      return { ok: true, message: 'User already on this plan' };
    }

    // Handle cancel subscription
    if (
      subscription.cancel_at_period_end &&
      subscription.canceled_at &&
      event.data.previous_attributes &&
      (event.data.previous_attributes as any).cancel_at_period_end === false
    ) {
      return {
        ok: true,
        status: 'cancelled',
        userId,
        priceId,
        subscriptionId: subscription.id,
      };
    }

    // Handle upgrade
    const previousPriceId = (event.data.previous_attributes as any)?.items?.[0]
      ?.price;
    const upgraded = previousPriceId && previousPriceId !== priceId;

    if (upgraded) {
      await this.userService.changeUserRole(userId, plan);
      this.logger.log(
        `User ${userId} upgraded from ${previousPriceId} to ${priceId} → role ${plan}`,
      );
      return { ok: true, status: 'upgraded', userId, plan };
    }

    // No plan change
    if (currentUser.role === plan) {
      this.logger.log(
        `User ${userId} already has role ${plan}, no changes needed.`,
      );
      return {
        ok: true,
        status: 'no-change',
        message: 'User already on this plan',
      };
    }

    this.logger.log(`User ${userId} upgraded to role ${plan} and notified.`);
    return { ok: true, status: 'unknown', userId, plan };
  }

  getPlanFromPrice(priceId?: string): string | null {
    if (!priceId) return null;

    switch (priceId) {
      case this.stripeConfigService.freePriceId:
      case this.stripeConfigService.freePriceYearlyId:
        return FREE_USER_ROLE;

      case this.stripeConfigService.proPriceId:
      case this.stripeConfigService.proPriceYearlyId:
        return PRO_USER_ROLE;

      case this.stripeConfigService.basicPriceId:
      case this.stripeConfigService.basicPriceYearlyId:
        return BASIC_USER_ROLE;

      case this.stripeConfigService.teamPriceId:
      case this.stripeConfigService.teamPriceYearlyId:
        return TEAM_USER_ROLE;

      default:
        return null;
    }
  }

  async getInvoice(
    latestInvoice: string | Stripe.Invoice | null,
  ): Promise<Stripe.Invoice | null> {
    if (typeof latestInvoice !== 'string') return null;

    try {
      return await this.stripeConnector.retrieveInvoice(latestInvoice);
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      return null;
    }
  }

  async createUserWithStripe(email: string) {
    return this.stripeConnector.createCustomer(email);
  }

  async checkUserHasPaymentMethod(
    customerId: string,
  ): Promise<string | Stripe.PaymentMethod | null> {
    return this.stripeConnector.hasDefaultPaymentMethod(customerId);
  }

  async getPriceDetails(priceId: string): Promise<Stripe.Price> {
    try {
      return await this.stripeConnector.retrievePrice(priceId);
    } catch (error) {
      throw new Error(`Error retrieving price: ${error.message}`);
    }
  }

  async cancelSubscriptionImmediately(
    subscriptionId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const stripeSub =
      await this.stripeConnector.cancelSubscription(subscriptionId);
    return { subscription: stripeSub };
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<{ subscription: Stripe.Subscription; endDate: string }> {
    const stripeSub = await this.stripeConnector.updateSubscription(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
    );

    // Convert the Unix timestamp to a readable date
    const endTimestamp = stripeSub.current_period_end * 1000;
    const endDate = new Date(endTimestamp);

    // Format date as DD/MM/YYYY
    const formattedDate = `${endDate.getDate().toString().padStart(2, '0')}/${(
      endDate.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${endDate.getFullYear()}`;

    return {
      subscription: stripeSub,
      endDate: formattedDate,
    };
  }

  async updateSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<UpgradeSubscriptionResponseDto> {
    const subscription =
      await this.stripeConnector.retrieveSubscription(subscriptionId);
    const itemId = subscription.items.data[0].id;

    const updatedSubscription = await this.stripeConnector.updateSubscription(
      subscriptionId,
      {
        proration_behavior: 'always_invoice',
        items: [
          {
            id: itemId,
            price: newPriceId,
          },
        ],
      },
    );

    // Get additional price information
    const priceInfo = await this.stripeConnector.retrievePrice(newPriceId);
    const productInfo = await this.stripeConnector.retrieveProduct(
      priceInfo.product as string,
    );

    return {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      current_period_start: updatedSubscription.current_period_start,
      current_period_end: updatedSubscription.current_period_end,
      customer: updatedSubscription.customer as string,
      plan: productInfo.name,
      price: priceInfo.unit_amount,
      currency: priceInfo.currency,
    };
  }

  async getBillingHistory(
    userId: string,
    stripeCustomerId: string,
    page = 1,
    pageSize = 10,
    startingAfter?: string,
  ): Promise<PaginatedResponse<BillingHistoryItem>> {
    // Nếu người dùng muốn trang > 1 nhưng không cung cấp startingAfter cursor
    // chúng ta cần lấy các trang trước để có được cursor đúng
    let cursorId = startingAfter;
    if (page > 1 && !startingAfter) {
      // Lấy cursor cho trang hiện tại
      let currentPage = 1;
      let lastInvoiceId: string | undefined;

      // Lặp qua các trang trước để lấy cursor
      while (currentPage < page) {
        const previousPageParams: any = {
          customer: stripeCustomerId,
          limit: pageSize,
        };

        if (lastInvoiceId) {
          previousPageParams.starting_after = lastInvoiceId;
        }
        const previousPageInvoices =
          await this.stripeConnector.listInvoices(previousPageParams);

        // Nếu không còn dữ liệu nữa, trả về trang cuối cùng
        if (
          previousPageInvoices.data.length === 0 ||
          !previousPageInvoices.has_more
        ) {
          return {
            data: [],
            total: (currentPage - 1) * pageSize,
            page,
            pageSize,
            message: 'Không có dữ liệu cho trang này',
            nextCursor: null,
            previousCursor: null,
          };
        }

        // Lưu ID của invoice cuối cùng làm cursor cho trang tiếp theo
        lastInvoiceId =
          previousPageInvoices.data[previousPageInvoices.data.length - 1].id;
        currentPage++;
      }

      cursorId = lastInvoiceId;
    }

    // Tham số cho việc lấy dữ liệu trang hiện tại
    const listParams: any = {
      customer: stripeCustomerId,
      limit: pageSize,
    };

    if (cursorId) {
      listParams.starting_after = cursorId;
    }

    const invoices = await this.stripeConnector.listInvoices(listParams);

    // Tính toán các thông tin phân trang
    const totalCountEstimate = page * pageSize + (invoices.has_more ? 1 : 0);
    const previousCursor = page > 1 ? cursorId : null;
    const nextCursor =
      invoices.has_more && invoices.data.length > 0
        ? invoices.data[invoices.data.length - 1].id
        : null;

    const data: BillingHistoryItem[] = invoices.data.map((invoice) => ({
      id: invoice.id,
      plan:
        this.getPlanFromPrice(invoice.lines?.data[0]?.price?.id) ?? 'Unknown',
      amount: invoice.amount_paid,
      currency: invoice.currency,
      startDate: new Date(invoice.created * 1000).toISOString(),
      invoicePdf: invoice.invoice_pdf ?? '',
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? '',
    }));

    return {
      data,
      total: totalCountEstimate,
      page,
      pageSize,
      message: 'Invoice history retrieved successfully',
      nextCursor,
      previousCursor,
    };
  }

  async getCurrent(
    userId: string,
    stripeCustomerId: string,
  ): Promise<PaymentSubscriptionDTO | null> {
    try {
      const subscriptions = await this.stripeConnector.listSubscriptions({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      const activeSubs = subscriptions.data.filter(
        (sub) => sub.status !== 'canceled' && !sub.cancel_at_period_end,
      );

      const latestSub = activeSubs[0];

      if (!latestSub) return null;

      if (!latestSub.items.data.length) {
        console.warn(`Subscription ${latestSub.id} doesn't have any items`);
        return null;
      }

      // 2. Identify cancelDate
      let cancelDate = null;

      // Nếu subscription đã set thời gian hủy cụ thể (hủy theo lịch định sẵn)
      if (latestSub.cancel_at) {
        cancelDate = new Date(latestSub.cancel_at * 1000);
      }
      // Nếu subscription được đánh dấu hủy vào cuối kỳ hiện tại (soft cancel)
      else if (latestSub.cancel_at_period_end) {
        cancelDate = new Date(latestSub.current_period_end * 1000);
      }

      const priceItem = latestSub.items.data[0]?.price;

      // Extract billing interval from price recurring object
      const billingInterval = priceItem?.recurring?.interval || null;

      // 3. Map Stripe subscription về StripeSubscription model
      return {
        id: latestSub.id,
        userId: userId,
        priceId: priceItem?.id || '',
        status: latestSub.status,
        startDate: new Date(latestSub.start_date * 1000),
        endDate: latestSub.ended_at
          ? new Date(latestSub.ended_at * 1000)
          : null,
        nextRenewDate: latestSub.current_period_end
          ? new Date(latestSub.current_period_end * 1000)
          : null,
        amount: (priceItem?.unit_amount || 0) / 100,
        currency: latestSub.currency,
        invoicePdf: null,
        hostedInvoiceUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: this.getPlanFromPrice(priceItem?.id) ?? 'Unknown',
        credit: 0,
        usedCredit: 0,
        curUsers: 0,
        maxUsers: 0,
        cancelDate: cancelDate,
        billingInterval: billingInterval,
      };
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  async getCurrentV2(
    userId: string,
    stripeCustomerId: string,
  ): Promise<Stripe.Subscription | null> {
    const subscriptions = await this.stripeConnector.listSubscriptions({
      customer: stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    const latestSub = subscriptions.data.sort((a, b) => {
      return (b.start_date || 0) - (a.start_date || 0);
    })[0];

    if (!latestSub) return null;

    return latestSub;
  }
}
