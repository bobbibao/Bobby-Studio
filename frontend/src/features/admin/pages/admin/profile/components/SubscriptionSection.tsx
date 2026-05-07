import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  SimpleGrid,
  Progress,
  Badge,
  Collapse,
  useBoolean,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDownIcon, Switch } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { capitalize } from '@/utils';
import { InvoiceList } from './InvoiceList';
import { PricingCard } from './PricingCard';
import { ComparisonTable } from './ComparisonTable';
import { ModalCancelSubscription } from './ModalCancelSubscription';
import { ModalConfirmUpgradeSubscription } from './ModalConfirmUpgradeSubscription';
import { useSubscriptionData } from '../hooks/useSubscriptionData';
import { SUBSCRIPTION_PLANS, CREDIT_EXCHANGE_RATES } from '@/features/admin/pages/admin/profile/constants/subscriptionPlans';
import PricingSubscriptionSkeleton from './PricingSubscriptionSkeleton';
import { SubscriptionResponseDtoV2 } from '@/types/subscriptionResponse.dto';
import { CreditPacksSection } from './CreditPacksSection';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import { useAppDispatch } from '@/hooks/useAppDispatch';
// --- Components ---

interface HeroSectionProps {
  subscription: SubscriptionResponseDtoV2 | null;
  onCancel: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ subscription, onCancel }) => {
  const { t } = useTranslation();
  const bgGradient = useColorModeValue('linear(to-br, white, zinc.50)', 'linear(to-br, whiteAlpha.200, whiteAlpha.50)');
  const borderColor = useColorModeValue('zinc.200', 'whiteAlpha.300');

  if (!subscription) return null;

  // Subscription credits
  const usedCredits = subscription.usedCredit || 0;
  const totalCredits = subscription.credit || 0;
  const percentage = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  // Extra purchased credits (from credit packs)
  const extraCredits = subscription.extraCredit || 0;
  const usedExtraCredits = subscription.usedExtraCredit || 0;
  const extraPercentage = extraCredits > 0 ? (usedExtraCredits / extraCredits) * 100 : 0;
  const hasExtraCredits = extraCredits > 0;

  const planName = subscription.plan ? capitalize(subscription.plan.toLowerCase()) : 'Free';

  return (
    <Box
      w="full"
      p={8}
      borderRadius="2xl"
      bg={useColorModeValue('white', 'transparent')}
      bgGradient={bgGradient}
      color={useColorModeValue('zinc.900', 'white')}
      position="relative"
      overflow="hidden"
      boxShadow={useColorModeValue('none', 'xl')}
      borderWidth="1px"
      borderColor={borderColor}
      className="backdrop-blur-xl"
    >
      {/* Decorative background elements could go here */}

      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'start', md: 'center' }}
        gap={6}
      >
        <Box flex="1">
          <Flex align="center" gap={3} mb={2}>
            <Badge
              bg={useColorModeValue('black', 'whiteAlpha.200')}
              color={useColorModeValue('white', 'white')}
              variant="solid"
              fontSize="0.9em"
              px={3}
              py={1}
              borderRadius="full"
            >
              {t('profile:current_plan')}
            </Badge>
            {subscription.nextRenewDate && (
              <Text fontSize="sm" opacity={0.9}>
                {t('profile:renews_on', {
                  date: format(new Date(subscription.nextRenewDate), 'MMM dd, yyyy'),
                })}
              </Text>
            )}
          </Flex>
          <Text fontSize="4xl" fontWeight="bold" mb={1}>
            {planName}
          </Text>
          <Text fontSize="lg" opacity={0.9} mb={1}>
            CHF{subscription.amount ? (subscription.amount / 100).toFixed(0) : 0} -{' '}
            {subscription.billingInterval === 'year' ? t('profile:billed_annually') : t('profile:billed_monthly')}
          </Text>
        </Box>

        <Box flex="1" w={{ base: 'full', md: 'auto' }} maxW={{ md: '400px' }}>
          {/* Subscription Credits */}
          <Flex justify="space-between" mb={2} fontSize="sm" fontWeight="medium">
            <Text>{hasExtraCredits ? t('profile:subscription_credit_usage') : t('profile:credit_usage')}</Text>
            <Text>
              {usedCredits} / {totalCredits} {t('profile:credits')}
            </Text>
          </Flex>
          <Progress
            value={percentage}
            size="sm"
            borderRadius="full"
            colorScheme={useColorModeValue('blackAlpha', 'whiteAlpha')}
            bg={useColorModeValue('zinc.200', 'whiteAlpha.300')}
            mb={hasExtraCredits ? 4 : 6}
          />

          {/* Extra Purchased Credits - only shown if user has purchased extra credits */}
          {hasExtraCredits && (
            <>
              <Flex justify="space-between" mb={2} fontSize="sm" fontWeight="medium">
                <Text>{t('profile:purchased_credit_usage')}</Text>
                <Text>
                  {usedExtraCredits} / {extraCredits} {t('profile:credits')}
                </Text>
              </Flex>
              <Progress
                value={extraPercentage}
                size="sm"
                borderRadius="full"
                colorScheme="green"
                bg={useColorModeValue('zinc.200', 'whiteAlpha.300')}
                mb={6}
              />
            </>
          )}

          <Flex gap={3}>
            <Button
              bg={useColorModeValue('black', 'white')}
              color={useColorModeValue('white', 'black')}
              _hover={{
                bg: useColorModeValue('black', 'white'),
                transform: 'scale(1.02)',
              }}
              transition="all 0.2s"
              fontWeight="medium"
              size="md"
              flex="1"
            >
              {t('profile:manage_payment')}
            </Button>
            <Button
              variant="outline"
              color={useColorModeValue('black', 'white')}
              _hover={{
                bg: 'red.600',
                color: 'white',
                borderColor: 'red.600',
                transform: 'scale(1.05)',
                boxShadow: 'md',
              }}
              transition="all 0.2s"
              borderWidth="1px"
              borderColor={useColorModeValue('zinc.300', 'whiteAlpha.300')}
              fontWeight="medium"
              size="md"
              onClick={onCancel}
              flex="1"
            >
              {t('common:cancel_plan')}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

// Credit Exchange Legend - matching screenshot
const CreditExchangeLegend: React.FC = () => {
  const { t } = useTranslation();
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const veryMutedTextColor = useColorModeValue('zinc.400', 'zinc.500');

  return (
    <Box textAlign="center" mt={8}>
      <Text fontSize="sm" color={mutedTextColor}>
        2K Bild = {CREDIT_EXCHANGE_RATES.image2k} Credits · 4K Bild = {CREDIT_EXCHANGE_RATES.image4k} Credits · Video ={' '}
        {CREDIT_EXCHANGE_RATES.video} Credits
      </Text>
      <Text fontSize="xs" color={veryMutedTextColor} mt={2}>
        * Gilt für alle Bilder ausser Bilder die rein mit Text Prompts generiert wurden.
      </Text>
    </Box>
  );
};

// Receipt icon for billing history
const ReceiptIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </svg>
);

// Billing History Section - matching Credit Packs styling
const BillingHistorySection: React.FC = () => {
  const { t } = useTranslation();
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');

  return (
    <Box w="full" mt={12}>
      {/* Section Header */}
      <Box mb={8}>
        {/* Badge */}
        <Badge
          bg="transparent"
          color={mutedTextColor}
          px={3}
          py={1.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="wider"
          mb={4}
          display="inline-flex"
          alignItems="center"
          gap={2}
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Box color={mutedTextColor}>
            <ReceiptIcon />
          </Box>
          {t('profile:billing_history_badge')}
        </Badge>

        {/* Title */}
        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="semibold" color={textColor} mb={3}>
          {t('profile:billing_history')}
        </Text>

        {/* Subtitle */}
        <Text fontSize="md" color={mutedTextColor} maxW="600px" lineHeight="tall">
          {t('profile:billing_history_description')}
        </Text>
      </Box>

      {/* Invoice List */}
      <InvoiceList />
    </Box>
  );
};

export function SubscriptionSection() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showComparison, { toggle: toggleComparison }] = useBoolean(false);
  const dispatch = useAppDispatch();
  // Modals
  const [modalCancelSubscription, toggleModalCancelSubscription] = useBoolean();
  const [modalConfirmUpgradeSubscription, toggleModalConfirmUpgradeSubscription] = useBoolean();
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  const { loading, prices, currentSubscription, refreshData } = useSubscriptionData({
    interval: billingCycle,
    plans: SUBSCRIPTION_PLANS,
  });

  // From feat/version2.7
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');

  // From feat/profile-subscription
  const navigate = useNavigate();
  const priceAmount = (() => {
    if (!selectedSubscription) return 0;
    const p = prices.find((pr: any) => pr.id === selectedSubscription.id);
    return p ? p.unitAmount ?? 0 : 0;
  })();

  return (
    <Box w="full" pb={10}>
      <Box display="flex" flexDirection="column" gap={8}>
        {/* SECTION 1: Active Plan Hero */}
        {currentSubscription && (
          <HeroSection subscription={currentSubscription} onCancel={toggleModalCancelSubscription.on} />
        )}

        {/* SECTION 2: Pricing Plans / Marketplace hybrid */}
        <Box position="relative">
          <Flex justify="center" align="center" mb={8} position="relative">
            <Box position="absolute" left="0">
              <Text fontSize="2xl" fontWeight="bold">
                {t('profile:pricing_plans')}
              </Text>
            </Box>

            {/* Slider Monthly / Yearly */}
            <Flex align="center" gap={4}>
              <Text
                fontWeight="bold"
                color={billingCycle === 'monthly' ? useColorModeValue('brand.600', 'white') : 'zinc.500'}
                cursor="pointer"
                onClick={() => setBillingCycle('monthly')}
                transition="color 0.2s"
              >
                {t('profile:monthly')}
              </Text>

              <Switch
                size="lg"
                colorScheme="purple"
                isChecked={billingCycle === 'yearly'}
                onChange={(e) => setBillingCycle(e.target.checked ? 'yearly' : 'monthly')}
              />

              <Text
                fontWeight="bold"
                color={billingCycle === 'yearly' ? useColorModeValue('brand.600', 'white') : 'zinc.500'}
                cursor="pointer"
                onClick={() => setBillingCycle('yearly')}
                transition="color 0.2s"
              >
                {t('profile:yearly')}{' '}
                <Badge colorScheme="green" ml={1} variant="solid" borderRadius="full">
                  {t('profile:save_percentage', { percent: 20 })}
                </Badge>
              </Text>
            </Flex>
          </Flex>

          {/* Pricing Cards */}
          {loading ? (
            <Box mt={6}>
              <PricingSubscriptionSkeleton />
            </Box>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5} mt={6}>
                {prices
                  .filter((p) => p.plan !== 'free' && p.plan !== 'enterprise')
                  .sort((a, b) => {
                    const order: Record<string, number> = { basic: 0, pro: 1, team: 2 };
                    return (order[a.plan] ?? 99) - (order[b.plan] ?? 99);
                  })
                  .map((plan) => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      intervalLabel={billingCycle}
                      isBestValue={plan.view?.isBestValue ?? false}
                      currentSubscription={currentSubscription}
                      onPurchase={() => {
                        if (currentSubscription) {
                          setSelectedSubscription(plan);
                          toggleModalConfirmUpgradeSubscription.on();
                        } else {
                          navigate(`/payment-details/${plan.id}`);
                        }
                      }}
                      onCancelPlan={toggleModalCancelSubscription.on}
                    />
                  ))}
              </SimpleGrid>

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
              {showComparison ? t('profile:hide_feature_comparison') : t('profile:show_feature_comparison')}
            </Button>

            <Collapse in={showComparison} animateOpacity>
              <ComparisonTable intervalLabel={billingCycle} prices={prices} />
            </Collapse>
          </Box>
        </Box>

        {/* SECTION 3: Credit Packs */}
        <CreditPacksSection />

        {/* SECTION 4: Billing History */}
        <BillingHistorySection />
      </Box>

      {/* Modals */}
      <ModalCancelSubscription
        open={modalCancelSubscription}
        onClose={() => {
          toggleModalCancelSubscription.off();
          // refresh happens only on success via onSuccess
        }}
        onSuccess={async () => {
          await dispatch(fetchCurrentUser()); // refresh user info/stats
          await refreshData(); // refresh subscription data
        }}
      />

      <ModalConfirmUpgradeSubscription
        priceAmount={priceAmount}
        priceId={selectedSubscription?.id}
        open={modalConfirmUpgradeSubscription}
        onClose={toggleModalConfirmUpgradeSubscription.off}
        onSuccess={async () => {
          await dispatch(fetchCurrentUser()); // Refresh user data to update features restrictions
          await refreshData();
        }}
        plan={billingCycle === 'yearly' ? 'annually' : 'monthly'}
      />
    </Box>
  );
}



