export interface StripeProduct {
    id: string;
    object: 'product';
    active: boolean;
    created: number;
    default_price?: string | null;
    description: string | null;
    images: string[];
    livemode: boolean;
    metadata: Record<string, string>;
    name: string;
    package_dimensions?: any | null;
    shippable?: boolean | null;
    statement_descriptor?: string | null;
    tax_code?: string | null;
    type: 'good' | 'service';
    unit_label?: string | null;
    updated: number;
    url?: string | null;
}

export interface StripeDeletedProduct {
    id: string;
    object: 'product';
    deleted: true;
}

export interface StripePricingResponseDTO {
    id: string;
    unit_amount: number | null;
    currency: string;
    product: string | StripeProduct | StripeDeletedProduct;
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

// Additional helper types for plan management
export type PlanType = 'basic' | 'pro' | 'team';
export type BillingCycle = 'monthly' | 'yearly';
export type PlanKey = `${PlanType}-${BillingCycle}`;


