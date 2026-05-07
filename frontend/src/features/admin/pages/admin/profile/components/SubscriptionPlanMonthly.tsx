import React, { useState } from 'react';
import { Box, SimpleGrid, useBoolean, Collapse, Text, Button, useColorModeValue } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { ModalCancelSubscription } from '@/features/admin/pages/admin/profile/components/ModalCancelSubscription';
import { ModalConfirmUpgradeSubscription } from '@/features/admin/pages/admin/profile/components/ModalConfirmUpgradeSubscription';
import PricingSubscriptionSkeleton from '@/features/admin/pages/admin/profile/components/PricingSubscriptionSkeleton';
import { PricingCard } from '@/features/admin/pages/admin/profile/components/PricingCard';
import { ComparisonTable } from '@/features/admin/pages/admin/profile/components/ComparisonTable';
import { useSubscriptionData } from '@/features/admin/pages/admin/profile/hooks/useSubscriptionData';
import { SUBSCRIPTION_PLANS, CREDIT_EXCHANGE_RATES } from '@/features/admin/pages/admin/profile/constants/subscriptionPlans';
import { useTranslation } from 'react-i18next';
import { StripePricingResponseDTO } from '@/types/stripePricingResponse.dto';
import { Price } from '@/types/price';
import { FreePlanCallout } from './FreePlanCallout';
import { CreditPacksSection } from './CreditPacksSection';

// Credit Exchange Legend
const CreditExchangeLegend: React.FC = () => {
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const veryMutedTextColor = useColorModeValue('zinc.400', 'zinc.500');

  return (
    <Box textAlign="center" mt={8}>
      <Text fontSize="sm" color={mutedTextColor}>
        2K Bild = {CREDIT_EXCHANGE_RATES.image2k} Credits · 4K Bild = {CREDIT_EXCHANGE_RATES.image4k} Credits · Video = {CREDIT_EXCHANGE_RATES.video} Credits
      </Text>
      <Text fontSize="xs" color={veryMutedTextColor} mt={2}>
        * Gilt für alle Bilder ausser Bilder die rein mit Text Prompts generiert wurden.
      </Text>
    </Box>
  );
};

export const SubscriptionPlanMonthly = () => {
  const { t } = useTranslation();

  const [modalCancelSubscription, toggleModalCancelSubscription] = useBoolean();
  const [modalConfirmUpgradeSubscription, toggleModalConfirmUpgradeSubscription] = useBoolean();
  const [selectedSubscription, setSelectedSubscription] = useState<Price | null>(null);
  const [showComparison, { toggle: toggleComparison }] = useBoolean(false);

  const { loading, prices, currentSubscription, refreshData } = useSubscriptionData({
    interval: 'monthly',
    plans: SUBSCRIPTION_PLANS,
  });

  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');

  return (
    <Box>
      {/* Free Plan Callout */}
      <FreePlanCallout
        onGetStarted={() => {
          const freePlan = prices?.find((p: any) => p.plan === 'free');
          if (freePlan) {
            setSelectedSubscription(freePlan);
            toggleModalConfirmUpgradeSubscription.on();
          }
        }}
        currentSubscription={currentSubscription}
      />

      {loading ? (
        <Box mt={6}>
          <PricingSubscriptionSkeleton />
        </Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5} mt={6}>
            {prices
              ?.filter((p: any) => p.plan !== 'free' && p.plan !== 'enterprise')
              .sort((a: any, b: any) => {
                const order = { basic: 0, pro: 1, team: 2 };
                return (order[a.plan as keyof typeof order] ?? 99) - (order[b.plan as keyof typeof order] ?? 99);
              })
              .map((plan: any, index: number) => {
                const isBestValue = plan?.view?.isBestValue || false;
                return (
                  <PricingCard
                    key={index}
                    plan={plan}
                    isBestValue={isBestValue}
                    intervalLabel="monthly"
                    currentSubscription={currentSubscription}
                    onPurchase={() => {
                      setSelectedSubscription(plan);
                      toggleModalConfirmUpgradeSubscription.on();
                    }}
                    onCancelPlan={toggleModalCancelSubscription.on}
                  />
                );
              })}
          </SimpleGrid>

          {/* Credit Exchange Legend */}
          <CreditExchangeLegend />
        </>
      )}

      {/* Feature Comparison Toggle */}
      <Box mt={10} textAlign="center">
        <Button
          variant="ghost"
          onClick={toggleComparison}
          rightIcon={
            <Box
              as="span"
              transition="transform 0.2s ease"
              transform={showComparison ? 'rotate(180deg)' : 'rotate(0deg)'}
            >
              <ChevronDownIcon boxSize={4} />
            </Box>
          }
          fontWeight="normal"
          color={mutedTextColor}
          fontSize="sm"
          _hover={{
            bg: 'transparent',
            color: textColor,
          }}
          _active={{ bg: 'transparent' }}
        >
          {showComparison ? t('profile:hide_feature_comparison') : 'Funktionsvergleich anzeigen'}
        </Button>

        <Collapse in={showComparison} animateOpacity>
          <ComparisonTable intervalLabel="monthly" prices={prices} />
        </Collapse>
      </Box>

      {/* Credit Packs Section */}
      <CreditPacksSection />

      <ModalCancelSubscription
        open={modalCancelSubscription}
        onClose={() => {
          toggleModalCancelSubscription.off();
          refreshData();
        }}
      />
      <ModalConfirmUpgradeSubscription
        priceId={selectedSubscription?.id}
        open={modalConfirmUpgradeSubscription}
        onClose={toggleModalConfirmUpgradeSubscription.off}
        onSuccess={refreshData}
        plan="monthly"
      />
    </Box>
  );
};



