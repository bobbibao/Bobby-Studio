import Stripe from 'stripe';

export interface PaymentPricingResponseDTO {
  id: string;
  unit_amount: number | null;
  currency: string;
  product: string | Stripe.Product | Stripe.DeletedProduct; // Thêm DeletedProduct
  productName: string;
  productDescription: string | null;
  currentPlan: boolean;
  plan: string;
  features?: string[];
}


export const priceFeaturesMapping: Record<string, string[]> = {
  'basic-yearly': [
    'Access to core AI design features',
    'Generate up to 5 projects per month',
    'Basic support',
    'Limited design template library',
  ],
  'pro-yearly': [
    'Unlimited project generation',
    'Full access to the premium design template library',
    'Priority customer support',
    'Collaborative tools for team projects',
    'Early access to new AI features and updates',
  ],
  'team-yearly': [
    'Unlimited project generation',
    'Full access to the premium design template library',
    'Priority customer support',
    'Collaborative tools for team projects',
    'Early access to new AI features and updates',
  ],
  'basic-monthly': [
    'Access to core AI design features',
    'Generate up to 5 projects per month',
    'Basic support',
    'Limited design template library',
  ],
  'pro-monthly': [
    'Unlimited project generation',
    'Full access to the premium design template library',
    'Priority customer support',
    'Collaborative tools for team projects',
    'Early access to new AI features and updates',
  ],
  'team-monthly': [
    'Unlimited project generation',
    'Full access to the premium design template library',
    'Priority customer support',
    'Collaborative tools for team projects',
    'Early access to new AI features and updates',
  ],
};
