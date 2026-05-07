export interface PlanView {
  plan: string;
  title?: string;
  subtitle?: string;
  descriptions?: string[];
  features?: string[];
  credits?: number | { monthly: number; yearly: number };
  prices?: { monthly: number; yearly: number };
  savings?: { yearly: number };
  equivalence?: { images: string; videos: string };
  isBestValue?: boolean;
  creditDiscount?: number;
  isNonCommercial?: boolean;
  seats?: Record<number, unknown>;
}

export interface Price {
  id: string;
  active: boolean;
  currency: string;
  unitAmount: number | null;
  product: string;
  productDescription: string;
  productName: string;
  currentPlan: boolean;
  plan: string;
  interval: string;
  view?: PlanView; 
  features?: string[];
}

export const mapApiResponseToPrice = (data: any): Price => ({
  id: data.id,
  active: data.active,
  currency: data.currency,
  unitAmount: data.unit_amount,
  product: data.product?.name ?? '',
  productDescription: data.productDescription ?? '',
  productName: data.productName,
  currentPlan: data.currentPlan || false,
  plan: data.plan,
  interval: data.interval,
});




