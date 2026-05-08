export interface CancelSubscriptionResponseDto {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number; // unix timestamp
}
