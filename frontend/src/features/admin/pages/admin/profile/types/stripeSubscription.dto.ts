// DTO StripeSubscription với cancelDate
export interface StripeSubscriptionDTO {
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
  // Extra credits purchased via credit packs (separate from subscription credits)
  extraCredit: number;
  usedExtraCredit: number;
  curUsers: number;
  maxUsers: number;
  cancelDate: Date | null;
  billingInterval: 'day' | 'week' | 'month' | 'year' | null;
}



