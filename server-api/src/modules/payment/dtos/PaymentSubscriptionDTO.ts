// StripeSubscription DTO including cancelDate
export class PaymentSubscriptionDTO {
  id: string;
  userId: string;
  priceId: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  nextRenewDate: Date | null;
  amount: number;
  currency: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: string | null;
  credit: number;
  usedCredit: number;
  curUsers: number;
  maxUsers: number;
  cancelDate: Date | null; // New cancelDate field
  billingInterval: 'day' | 'week' | 'month' | 'year' | null; // Billing period: monthly or yearly
}
