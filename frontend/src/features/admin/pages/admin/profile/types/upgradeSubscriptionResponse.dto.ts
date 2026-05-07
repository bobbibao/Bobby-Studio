export interface UpgradeSubscriptionResponseDto {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  customer: string;
  plan: string;
  price: number;
  currency: string;
}



