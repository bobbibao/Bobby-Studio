import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PlanType = 'basic' | 'pro' | 'free';
export type BillingCycle = 'monthly' | 'yearly';

@Injectable()
export class PaymentConfigService {
  private readonly logger = new Logger(PaymentConfigService.name);
  readonly apiKey: string;
  readonly webhookSecret: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly enabled: boolean;

  readonly freePriceId: string;
  readonly freePriceYearlyId: string;

  readonly proPriceId: string;
  readonly proPriceYearlyId: string;

  readonly basicPriceId: string;
  readonly basicPriceYearlyId: string;

  readonly teamPriceId: string;
  readonly teamPriceYearlyId: string;

  readonly priceIdMap: Record<BillingCycle, Record<PlanType, string>>;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>(
      'STRIPE_API_KEY',
      '',
    );
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      'whsec_default2',
    );
    this.successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL', '');
    this.cancelUrl = this.configService.get<string>('STRIPE_CANCEL_URL', '');

    this.freePriceId = this.configService.get<string>(
      'STRIPE_FREE_PRICE_ID',
      '',
    );
    this.freePriceYearlyId = this.configService.get<string>(
      'STRIPE_FREE_PRICE_YEARLY_ID',
      '',
    );

    this.proPriceId = this.configService.get<string>('STRIPE_PRO_PRICE_ID', '');
    this.proPriceYearlyId = this.configService.get<string>(
      'STRIPE_PRO_PRICE_YEARLY_ID',
      '',
    );

    this.basicPriceId = this.configService.get<string>(
      'STRIPE_BASIC_PRICE_ID',
      '',
    );
    this.basicPriceYearlyId = this.configService.get<string>(
      'STRIPE_BASIC_PRICE_YEARLY_ID',
      '',
    );

    this.teamPriceId = this.configService.get<string>(
      'STRIPE_TEAM_PRICE_ID',
      '',
    );
    this.teamPriceYearlyId = this.configService.get<string>(
      'STRIPE_TEAM_PRICE_YEARLY_ID',
      '',
    );

    this.enabled = Boolean(this.apiKey && this.apiKey.trim().length > 0);
    if (!this.enabled) {
      this.logger.warn(
        'STRIPE_API_KEY is not set. Payment/Stripe features are disabled for this environment.',
      );
    }

    // Price ID mapping cho dễ lookup
    this.priceIdMap = {
      monthly: {
        free: this.freePriceId,
        basic: this.basicPriceId,
        pro: this.proPriceId,
      },
      yearly: {
        free: this.freePriceYearlyId,
        basic: this.basicPriceYearlyId,
        pro: this.proPriceYearlyId,
      },
    };
  }

  //mapping priceId ➝ credit mỗi tháng, ví dụ:
  getMonthlyCreditByPriceId(priceId: string): number | undefined {
    const creditMap: Record<string, number> = {
      [this.freePriceId]: 100,
      [this.basicPriceId]: 4000,
      [this.proPriceId]: 10000,
      [this.teamPriceId]: 1000,
      [this.freePriceYearlyId]: 100,
      [this.basicPriceYearlyId]: 4000,
      [this.proPriceYearlyId]: 10000,
      [this.teamPriceYearlyId]: 1000,
    };
    const credit = creditMap[priceId];
    return credit;
  }

  // Tiện ích phụ để xác định billingCycle từ priceId
  getBillingCycle(priceId: string): BillingCycle | undefined {
    const { monthly, yearly } = this.priceIdMap;
    if (Object.values(monthly).includes(priceId)) return 'monthly';
    if (Object.values(yearly).includes(priceId)) return 'yearly';
    return undefined;
  }

  // Tiện ích phụ để xác định plan từ priceId
  getPlanFromPriceId(priceId: string): PlanType | undefined {
    for (const cycle of ['monthly', 'yearly'] as BillingCycle[]) {
      const plans = this.priceIdMap[cycle];
      for (const [plan, id] of Object.entries(plans)) {
        if (id === priceId) return plan as PlanType;
      }
    }
    return undefined;
  }
}
