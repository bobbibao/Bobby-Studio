import React, { useState } from 'react';
import { Box, Divider, Text, Flex, useColorModeValue, Badge, Button } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@/utils';
import { getPlanChangeType } from '@/features/admin/pages/admin/profile/constants/subscriptionPlans';
import { SubscriptionResponseDtoV2 } from '@/types/subscriptionResponse.dto';

// Coin/Credits icon
const CoinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-zinc-400">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Checkmark icon
const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-zinc-400 dark:text-zinc-500"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface PricingCardProps {
  plan: any;
  isBestValue: boolean;
  intervalLabel: 'monthly' | 'yearly';
  currentSubscription: SubscriptionResponseDtoV2 | null;
  onPurchase: () => void;
  onCancelPlan: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = React.memo(
  ({ plan, isBestValue, intervalLabel, currentSubscription, onPurchase, onCancelPlan }) => {
    const { t } = useTranslation();
    const translatorProfileNS = (key: string, options?: Record<string, any>) =>
      t(`profile:${key}`, options);
    const { currentPlan, view, unitAmount, plan: planType } = plan;

    // Determine if this plan change is an upgrade or downgrade
    const targetPlanName = view?.plan || planType || '';
    const planChangeType = getPlanChangeType(
      currentSubscription?.plan,
      currentSubscription?.interval,
      targetPlanName,
      intervalLabel
    );

    // Get appropriate button label based on plan change type
    const getButtonLabel = () => {
      if (planChangeType === 'current') {
        return t('common:current_plan');
      }
      if (planChangeType === 'upgrade') {
        return t('common:upgrade');
      }
      return t('common:downgrade');
    };

    // Team plan seat selector state
    const [selectedSeats, setSelectedSeats] = useState<3 | 5>(3);

    // Determine if this is a team plan
    const isTeamPlan = view?.plan === 'team' || planType === 'team';
    const isPro = view?.plan === 'pro' || planType === 'pro';
    const isFree = view?.plan === 'free' || planType === 'free';

    // Get pricing and credits based on plan type
    const getPlanData = () => {
      if (isFree) {
        return {
          price: 0,
          credits: 100,
          equivalence: { images: '~10', videos: '0' },
          savings: 0,
        };
      }

      // Team plan - use data from view.seats
      if (isTeamPlan && view?.seats) {
        const seatData = view.seats[selectedSeats];
        if (seatData) {
          return {
            price: intervalLabel === 'yearly' ? seatData.yearly : seatData.monthly,
            totalPrice: intervalLabel === 'yearly' ? seatData.totalYearly : seatData.totalMonthly,
            credits: seatData.credits,
            equivalence: seatData.equivalence,
            savings: intervalLabel === 'yearly' ? seatData.savings : 0,
            totalUsers: selectedSeats,
          };
        }
      }

      // Basic or Pro plan - use prices from view if available, fallback to API
      if (view?.prices) {
        const viewPrice = intervalLabel === 'yearly' ? view.prices.yearly : view.prices.monthly;
        return {
          price: viewPrice,
          credits: view?.credits?.[intervalLabel] || 0,
          equivalence: view?.equivalence || { images: '0', videos: '0' },
          savings: intervalLabel === 'yearly' ? view?.savings?.yearly || 0 : 0,
        };
      }

      // Fallback to API unitAmount
      const priceValue = unitAmount ? unitAmount / 100 : 0;
      const displayPrice = intervalLabel === 'yearly' ? priceValue / 12 : priceValue;

      return {
        price: displayPrice,
        credits: view?.credits?.[intervalLabel] || 0,
        equivalence: view?.equivalence || { images: '0', videos: '0' },
        savings: intervalLabel === 'yearly' ? view?.savings?.yearly || 0 : 0,
      };
    };

    const planData = getPlanData();

    // Color mode values
    const cardBg = useColorModeValue('white', 'zinc.800');
    const cardBorder = useColorModeValue('zinc.200', 'zinc.700');
    const proBorder = useColorModeValue('zinc.900', 'zinc.500');
    const textColor = useColorModeValue('zinc.900', 'white');
    const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
    const savingsColor = 'green.500';
    const dividerColor = useColorModeValue('zinc.200', 'zinc.700');
    const seatActiveBg = useColorModeValue('white', 'zinc.700');
    const seatInactiveBg = useColorModeValue('zinc.100', 'zinc.800');
    const seatBorder = useColorModeValue('zinc.200', 'zinc.600');
    
    // Button colors
    const proButtonBg = useColorModeValue('zinc.900', 'white');
    const proButtonColor = useColorModeValue('white', 'zinc.900');
    const proButtonHoverBg = useColorModeValue('zinc.800', 'zinc.100');
    const defaultButtonBg = useColorModeValue('zinc.100', 'zinc.700');
    const defaultButtonColor = useColorModeValue('zinc.600', 'zinc.300');
    const defaultButtonHoverBg = useColorModeValue('zinc.200', 'zinc.600');
    
    // Current plan button (faded)
    const currentPlanBg = 'transparent';
    const currentPlanColor = useColorModeValue('zinc.400', 'zinc.500');
    const currentPlanBorder = useColorModeValue('zinc.200', 'zinc.700');

    // Format credits with apostrophes (Swiss style)
    const formatCredits = (num: number) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    };

    return (
      <Box
        bg={cardBg}
        borderWidth={isPro ? '2px' : '1px'}
        borderColor={isPro ? proBorder : cardBorder}
        borderRadius="xl"
        position="relative"
        display="flex"
        flexDirection="column"
        p={6}
        minH="520px"
      >
        {/* Header: Plan Name + Badge (Pro) or Seat Toggle (Team) */}
        <Flex justify="space-between" align="flex-start" mb={1}>
          <Flex align="center" gap={2}>
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              {view?.plan ? capitalize(t(`common:${view.plan}`)) : capitalize(planType || 'Unknown')}
            </Text>
            {/* Best Value Badge - always show for Pro */}
            {isPro && (
              <Badge
                bg={useColorModeValue('zinc.100', 'zinc.700')}
                color={textColor}
                px={2}
                py={0.5}
                borderRadius="md"
                fontSize="xs"
                fontWeight="medium"
                borderWidth="1px"
                borderColor={useColorModeValue('zinc.200', 'zinc.600')}
              >
                {translatorProfileNS('pricing_card.best_value')}
              </Badge>
            )}
          </Flex>

          {/* Team Seat Selector */}
          {isTeamPlan && (
            <Flex
              bg={seatInactiveBg}
              borderRadius="md"
              p="2px"
              borderWidth="1px"
              borderColor={seatBorder}
            >
              <Box
                px={2.5}
                py={1}
                borderRadius="md"
                cursor="pointer"
                bg={selectedSeats === 3 ? seatActiveBg : 'transparent'}
                onClick={() => setSelectedSeats(3)}
                transition="all 0.15s"
              >
                <Text fontSize="xs" fontWeight="medium" color={selectedSeats === 3 ? textColor : mutedTextColor}>
                  3 User
                </Text>
              </Box>
              <Box
                px={2.5}
                py={1}
                borderRadius="md"
                cursor="pointer"
                bg={selectedSeats === 5 ? seatActiveBg : 'transparent'}
                onClick={() => setSelectedSeats(5)}
                transition="all 0.15s"
              >
                <Text fontSize="xs" fontWeight="medium" color={selectedSeats === 5 ? textColor : mutedTextColor}>
                  5 User
                </Text>
              </Box>
            </Flex>
          )}
        </Flex>

        {/* Subtitle */}
        <Text fontSize="sm" color={mutedTextColor} mb={5}>
          {view?.subtitle
            ? translatorProfileNS(view.subtitle)
            : view?.title
            ? translatorProfileNS(view.title)
            : `${capitalize(planType || 'Unknown')} Plan`}
        </Text>

        {/* Price Section */}
        <Box mb={1}>
          <Flex align="baseline">
            <Text
              fontSize="4xl"
              fontWeight="semibold"
              letterSpacing="-0.02em"
              color={textColor}
            >
              CHF {isFree ? '0' : Math.round(planData.price)}
            </Text>
            <Text fontSize="sm" color={mutedTextColor} ml={1}>
              {isTeamPlan ? '/ User / Mt.' : '/ Mt.'}
            </Text>
          </Flex>

          {/* Total for Team plan */}
          {isTeamPlan && planData.totalPrice && (
            <Text fontSize="sm" color={mutedTextColor} mt={0.5}>
              Total: CHF {Math.round(planData.totalPrice)} / Mt.
            </Text>
          )}

          {/* Savings text (only for yearly) */}
          {!isFree && intervalLabel === 'yearly' && planData.savings > 0 && (
            <Text fontSize="sm" color={savingsColor} fontWeight="medium" mt={0.5}>
              Sparen Sie CHF {planData.savings}/Jahr
            </Text>
          )}
        </Box>

        {/* Credits Section */}
        <Box my={4}>
          <Flex align="center" gap={2} mb={0.5}>
            <Box color={mutedTextColor}>
              <CoinIcon />
            </Box>
            <Text
              fontSize="md"
              fontWeight="semibold"
              color={textColor}
            >
              {formatCredits(planData.credits)} Credits
            </Text>
          </Flex>
          <Text fontSize="sm" color={mutedTextColor}>
            {planData.equivalence.images} Bilder {t('common:or')} {planData.equivalence.videos} Videos
          </Text>
        </Box>

        <Divider borderColor={dividerColor} mb={5} />

        {/* CTA Button */}
        <Box mb={5}>
          {currentPlan || planChangeType === 'current' || isTeamPlan ? (
            <Button
              w="full"
              h="44px"
              borderRadius="lg"
              fontWeight="normal"
              bg={currentPlanBg}
              color={currentPlanColor}
              borderWidth="1px"
              borderStyle="dashed"
              borderColor={currentPlanBorder}
              cursor="default"
              isDisabled
              _disabled={{
                opacity: 0.8,
                cursor: 'default',
              }}
            >
              {isTeamPlan ? t('common:coming_soon') : t('common:current_plan')}
            </Button>
          ) : isPro ? (
            <Button
              w="full"
              h="44px"
              borderRadius="lg"
              fontWeight="medium"
              bg={proButtonBg}
              color={proButtonColor}
              border="none"
              _hover={{
                bg: proButtonHoverBg,
              }}
              onClick={onPurchase}
            >
              {getButtonLabel()}
            </Button>
          ) : (
            <Button
              w="full"
              h="44px"
              borderRadius="lg"
              fontWeight="medium"
              bg={defaultButtonBg}
              color={defaultButtonColor}
              border="none"
              _hover={{
                bg: defaultButtonHoverBg,
              }}
              onClick={onPurchase}
            >
              {getButtonLabel()}
            </Button>
          )}
        </Box>

        {/* Features List */}
        <Box className="space-y-3 flex-1">
          {(view?.features || view?.descriptions)?.map((feature: string, i: number) => {
            let featureText = translatorProfileNS(feature);
            
            // For Team plan, update the first feature to show selected seat count
            if (isTeamPlan && i === 0) {
              featureText = `${selectedSeats} ${t('profile:users')}`;
            }
            
            return (
              <Flex key={i} align="center" gap={2.5}>
                <Box flexShrink={0}>
                  <CheckIcon />
                </Box>
                <Text fontSize="sm" color={mutedTextColor}>
                  {featureText}
                </Text>
              </Flex>
            );
          })}
        </Box>

        {/* VAT Note */}
        <Text fontSize="xs" color={mutedTextColor} mt={4} opacity={0.7}>
          {t('profile:excl_vat')}
        </Text>

        {/* Cancel Link for Current Plan */}
        {currentPlan && (
          <Box mt={3} textAlign="center">
            <Text
              as="span"
              fontSize="sm"
              color={mutedTextColor}
              _hover={{ color: 'red.500', cursor: 'pointer' }}
              onClick={onCancelPlan}
              textDecoration="underline"
            >
              {t('common:cancel_plan')}
            </Text>
          </Box>
        )}
      </Box>
    );
  }
);



