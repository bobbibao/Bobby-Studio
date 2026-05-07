import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentSubscription, getPrices } from '@/features/user';
import { mapApiResponseToPrice, Price, PlanView } from '@/features/admin/pages/admin/profile/types/price';
import { SubscriptionResponseDtoV2 } from '@/types/subscriptionResponse.dto';
import { StripePricingResponseDTO } from '@/types/stripePricingResponse.dto';
import { set } from 'lodash';

interface UseSubscriptionDataProps {
  interval: 'monthly' | 'yearly';
  plans: Record<string, unknown>;
}

// Fallback Team plan data (used if API doesn't return team plan)
const TEAM_PLAN_FALLBACK: {
  monthly: StripePricingResponseDTO;
  yearly: StripePricingResponseDTO;
} = {
  monthly: {
    id: 'team_monthly',
    currency: 'chf',
    unit_amount: 82500, // 825 CHF total for 3 users (275 per user)
    product: 'Team Plan',
    productDescription: 'Team subscription for collaboration',
    productName: 'Team',
    currentPlan: false,
    plan: 'team',
  },
  yearly: {
    id: 'team_yearly',
    currency: 'chf',
    unit_amount: 792000, // 660 CHF/month * 12 = 7920 CHF total for 3 users yearly
    product: 'Team Plan',
    productDescription: 'Team subscription for collaboration',
    productName: 'Team',
    currentPlan: false,
    plan: 'team',
  },
};

export const useSubscriptionData = ({ interval, plans }: UseSubscriptionDataProps) => {
  const [loading, setLoading] = useState(false);
  // Store raw API response
  const [allPrices, setAllPrices] = useState<{
    monthly: StripePricingResponseDTO[];
    yearly: StripePricingResponseDTO[];
  }>({ monthly: [], yearly: [] });
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponseDtoV2 | null>(null);

  // Fetch data only once on mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Optimistically clear current subscription so UI can hide while refetching (e.g., after cancel)
      setCurrentSubscription(null);

      const [pricesResult, subscriptionResult] = await Promise.allSettled([getPrices(), getCurrentSubscription()]);

      if (pricesResult.status === 'fulfilled') {
        const prices = (pricesResult.value as {
          monthly: StripePricingResponseDTO[];
          yearly: StripePricingResponseDTO[];
        }) || { monthly: [], yearly: [] };

        let monthlyPrices: StripePricingResponseDTO[] = prices.monthly || [];
        let yearlyPrices: StripePricingResponseDTO[] = prices.yearly || [];

        // Ensure team plan exists (fallback)
        const hasTeamMonthly = monthlyPrices.some((p) => p.plan === 'team');
        const hasTeamYearly = yearlyPrices.some((p) => p.plan === 'team');

        if (!hasTeamMonthly) {
          monthlyPrices = [...monthlyPrices, TEAM_PLAN_FALLBACK.monthly];
        }
        if (!hasTeamYearly) {
          yearlyPrices = [...yearlyPrices, TEAM_PLAN_FALLBACK.yearly];
        }

        setAllPrices({
          monthly: monthlyPrices,
          yearly: yearlyPrices,
        });
      }

      if (subscriptionResult.status === 'fulfilled') {
        setCurrentSubscription(subscriptionResult.value || null);
      } else {
        setCurrentSubscription(null);
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('fetchData');
    fetchData();
  }, [fetchData]);



  // Derive prices based on selected interval
  const prices = useMemo((): Price[] => {
    const intervalPrices = allPrices[interval] || [];

    if (!intervalPrices.length) return [];

    return intervalPrices.map((item) => ({
      ...mapApiResponseToPrice(item),
      view: plans[item.plan as keyof typeof plans] as PlanView | undefined,
      features: item.features,
    }));
  }, [allPrices, interval, plans]);

  const currentPlanActive = useMemo(() => {
    return prices.find((el) => el?.currentPlan) || null;
  }, [prices]);

  return {
    loading,
    prices, // This now updates instantly without refetching
    currentSubscription,
    currentPlanActive,
    refreshData: fetchData,
  };
};




