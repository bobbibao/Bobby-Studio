// Credit-based pricing plans for Bobby
// Based on website pricing page design specification

export interface PlanFeature {
  key: string;
  included: boolean;
}

export interface PlanData {
  plan: string;
  title: string;
  subtitle: string;
  credits: {
    monthly: number;
    yearly: number;
  };
  prices: {
    monthly: number;
    yearly: number;
  };
  equivalence: {
    images: string;
    videos: string;
  };
  features: string[];
  isBestValue?: boolean;
  creditDiscount?: number;
}

export interface TeamPlanData extends Omit<PlanData, 'credits' | 'prices' | 'equivalence'> {
  seats: {
    [key: number]: {
      credits: number;
      monthly: number;
      yearly: number;
      equivalence: {
        images: string;
        videos: string;
      };
    };
  };
  creditDiscount: number;
}

export const FREE_PLAN = {
  plan: 'free',
  title: 'pricing_card.plans.free.title',
  subtitle: 'pricing_card.plans.free.subtitle',
  credits: 100,
  equivalence: {
    images: '~10',
    videos: '0',
  },
  features: [
    'pricing_card.plans.free.features.0',
    'pricing_card.plans.free.features.1',
    'pricing_card.plans.free.features.2',
    'pricing_card.plans.free.features.3',
  ],
  isNonCommercial: true,
};

export const SUBSCRIPTION_PLANS = {
  free: {
    plan: 'free',
    title: 'pricing_card.plans.free.title',
    subtitle: 'pricing_card.plans.free.subtitle',
    descriptions: [
      'pricing_card.plans.free.descriptions.0',
      'pricing_card.plans.free.descriptions.1',
      'pricing_card.plans.free.descriptions.2',
      'pricing_card.plans.free.descriptions.3',
    ],
    credits: 100,
    equivalence: {
      images: '~10',
      videos: '0',
    },
    isNonCommercial: true,
  },
  basic: {
    plan: 'basic',
    title: 'pricing_card.plans.basic.title',
    subtitle: 'pricing_card.plans.basic.subtitle',
    descriptions: [
      'pricing_card.plans.basic.descriptions.0',
      'pricing_card.plans.basic.descriptions.1',
      'pricing_card.plans.basic.descriptions.2',
      'pricing_card.plans.basic.descriptions.3',
      'pricing_card.plans.basic.descriptions.4',
    ],
    features: [
      'pricing_card.plans.basic.features.0',
      'pricing_card.plans.basic.features.1',
      'pricing_card.plans.basic.features.2',
      'pricing_card.plans.basic.features.3',
      'pricing_card.plans.basic.features.4',
    ],
    credits: {
      monthly: 4000,
      yearly: 4000,
    },
    prices: {
      monthly: 150,
      yearly: 120, // per month when billed yearly
    },
    savings: {
      yearly: 360, // CHF saved per year
    },
    equivalence: {
      images: '~200-800',
      videos: '~11',
    },
    creditDiscount: 0,
  },
  pro: {
    plan: 'pro',
    title: 'pricing_card.plans.pro.title',
    subtitle: 'pricing_card.plans.pro.subtitle',
    descriptions: [
      'pricing_card.plans.pro.descriptions.0',
      'pricing_card.plans.pro.descriptions.1',
      'pricing_card.plans.pro.descriptions.2',
      'pricing_card.plans.pro.descriptions.3',
      'pricing_card.plans.pro.descriptions.4',
    ],
    features: [
      'pricing_card.plans.pro.features.0',
      'pricing_card.plans.pro.features.1',
      'pricing_card.plans.pro.features.2',
      'pricing_card.plans.pro.features.3',
      'pricing_card.plans.pro.features.4',
    ],
    credits: {
      monthly: 10000,
      yearly: 10000,
    },
    prices: {
      monthly: 330,
      yearly: 264, // per month when billed yearly
    },
    savings: {
      yearly: 792, // CHF saved per year
    },
    equivalence: {
      images: "~500-2'000",
      videos: '~29',
    },
    isBestValue: true,
    creditDiscount: 10,
  },
  team: {
    plan: 'team',
    title: 'pricing_card.plans.team.title',
    subtitle: 'pricing_card.plans.team.subtitle',
    descriptions: [
      'pricing_card.plans.team.descriptions.0',
      'pricing_card.plans.team.descriptions.1',
      'pricing_card.plans.team.descriptions.2',
      'pricing_card.plans.team.descriptions.3',
      'pricing_card.plans.team.descriptions.4',
    ],
    features: [
      'pricing_card.plans.team.features.0',
      'pricing_card.plans.team.features.1',
      'pricing_card.plans.team.features.2',
      'pricing_card.plans.team.features.3',
      'pricing_card.plans.team.features.4',
    ],
    seats: {
      3: {
        credits: 30000,
        monthly: 275, // per user
        yearly: 220, // per user per month when billed yearly
        totalMonthly: 825,
        totalYearly: 660,
        savings: 1980,
        equivalence: {
          images: "~1'500-6'000",
          videos: '~86',
        },
      },
      5: {
        credits: 50000,
        monthly: 275, // per user
        yearly: 220, // per user per month when billed yearly
        totalMonthly: 1375,
        totalYearly: 1100,
        savings: 3300,
        equivalence: {
          images: "~2'500-10'000",
          videos: '~145',
        },
      },
    },
    creditDiscount: 20,
  },
} as const;

// Credit exchange rates legend
export const CREDIT_EXCHANGE_RATES = {
  image2k: 15, // 2K image = 15 credits
  image4k: 25, // 4K image = 25 credits
  video: 350, // Video = 350 credits
};

// Credit pack pricing
export const CREDIT_PACKS = [
  {
    credits: 1000,
    prices: {
      basic: 49,
      pro: 44, // 10% discount
      team: 39, // 20% discount
    },
  },
  {
    credits: 2500,
    prices: {
      basic: 115,
      pro: 103,
      team: 92,
    },
  },
  {
    credits: 5000,
    prices: {
      basic: 210,
      pro: 189,
      team: 168,
    },
  },
];

// Feature comparison data for table
// Plan tier hierarchy for determining upgrade vs downgrade
// Higher tier = higher number
export const PLAN_TIERS: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  team: 3,
};

// Billing interval weights (yearly is considered higher commitment)
export const INTERVAL_WEIGHTS: Record<string, number> = {
  month: 0,
  year: 1,
};

/**
 * Determines if switching from currentPlan to targetPlan is an upgrade, downgrade, or same plan
 * @returns 'upgrade' | 'downgrade' | 'current'
 */
export function getPlanChangeType(
  currentPlan: string | null | undefined,
  currentInterval: string | null | undefined,
  targetPlan: string,
  targetInterval: 'monthly' | 'yearly'
): 'upgrade' | 'downgrade' | 'current' {
  // If no current plan, any paid plan is an upgrade
  if (!currentPlan || currentPlan.toLowerCase() === 'free') {
    return targetPlan.toLowerCase() === 'free' ? 'current' : 'upgrade';
  }

  const currentPlanLower = currentPlan.toLowerCase();
  const targetPlanLower = targetPlan.toLowerCase();
  
  const currentTier = PLAN_TIERS[currentPlanLower] ?? 0;
  const targetTier = PLAN_TIERS[targetPlanLower] ?? 0;

  // Different plan tiers
  if (targetTier > currentTier) {
    return 'upgrade';
  }
  if (targetTier < currentTier) {
    return 'downgrade';
  }

  // Same plan tier - compare billing interval
  const currentIntervalLower = currentInterval?.toLowerCase() || 'month';
  const targetIntervalMapped = targetInterval === 'yearly' ? 'year' : 'month';
  
  const currentWeight = INTERVAL_WEIGHTS[currentIntervalLower] ?? 0;
  const targetWeight = INTERVAL_WEIGHTS[targetIntervalMapped] ?? 0;

  if (targetWeight > currentWeight) {
    return 'upgrade';
  }
  if (targetWeight < currentWeight) {
    return 'downgrade';
  }

  return 'current';
}

export const COMPARISON_FEATURES = [
  {
    key: 'credits_per_month',
    basic: '4\'000',
    pro: '10\'000',
    team: '30\'000',
    free: '100',
  },
  {
    key: 'images',
    basic: '~200-800',
    pro: '~500-2\'000',
    team: '~1\'500-6\'000',
    free: '~10',
  },
  {
    key: 'videos',
    basic: '~11',
    pro: '~29',
    team: '~86',
    free: '0',
  },
  {
    key: 'parallel_generations',
    basic: 'Max 4',
    pro: 'Max 8',
    team: 'Max 8',
    free: 'Max 1',
  },
  {
    key: 'resolution',
    basic: '1-2K (4K Upscale)',
    pro: '4K Native (8K Upscale)',
    team: '4K Native (8K Upscale)',
    free: '1K',
  },
  {
    key: 'shared_credit_pool',
    basic: false,
    pro: false,
    team: true,
    free: false,
  },
  {
    key: 'early_access',
    basic: false,
    pro: true,
    team: true,
    free: false,
  },
  {
    key: 'projects',
    basic: '5',
    pro: 'Unlimited',
    team: 'Unlimited',
    free: '2',
  },
  {
    key: 'cloud_backup',
    basic: '2 Months',
    pro: 'Unlimited',
    team: 'Unlimited',
    free: 'None',
  },
  {
    key: 'support',
    basic: false,
    pro: 'Chat Support',
    team: 'Chat Support',
    free: false,
  },
  {
    key: 'credit_discount',
    basic: '—',
    pro: '10%',
    team: '20%',
    free: '—',
  },
  {
    key: 'monthly_course',
    basic: false,
    pro: true,
    team: true,
    free: false,
  },
  {
    key: 'onboarding_course',
    basic: false,
    pro: false,
    team: true,
    free: false,
  },
  {
    key: 'archicad_plugin',
    basic: false,
    pro: true,
    team: true,
    free: false,
  },
  {
    key: 'templates',
    basic: true,
    pro: true,
    team: true,
    free: true,
  },
];



