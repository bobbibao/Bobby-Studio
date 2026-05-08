import { PaymentSubscriptionDTO } from '../../payment/dtos/PaymentSubscriptionDTO';

export class SubscriptionResponseDto {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  customer: string;
}

export class SubscriptionResponseDtoV2 {
  id: string;
  userId: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  nextRenewDate: Date | null;
  amount: number;
  currency: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  plan?: string;
  createdAt: Date;
  updatedAt: Date;
  credit: number;
  usedCredit: number;
  curUsers: number;
  maxUsers: number;
  cancelDate: Date | null;

  constructor(subscription: PaymentSubscriptionDTO) {
    this.id = subscription.id;
    this.userId = subscription.userId;
    this.status = subscription.status;
    this.startDate = subscription.startDate;
    this.endDate = subscription.endDate || null;
    this.nextRenewDate = subscription.nextRenewDate || null;
    this.amount = subscription.amount;
    this.currency = subscription.currency;
    this.invoicePdf = subscription.invoicePdf || null;
    this.hostedInvoiceUrl = subscription.hostedInvoiceUrl || null;
    this.plan = subscription.plan || null;
    this.createdAt = subscription.createdAt;
    this.updatedAt = subscription.updatedAt;
    this.credit = subscription.credit || 0;
    this.usedCredit = subscription.usedCredit || 0;
    this.curUsers = subscription.curUsers || 0;
    this.maxUsers = subscription.maxUsers || 0;
    this.cancelDate = subscription.cancelDate || null;
  }
}
