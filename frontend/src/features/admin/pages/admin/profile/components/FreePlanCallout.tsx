import React from 'react';
import { Box, Flex, Text, useColorModeValue, Button } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { FREE_PLAN } from '@/features/admin/pages/admin/profile/constants/subscriptionPlans';
import { SubscriptionResponseDtoV2 } from '@/types/subscriptionResponse.dto';

interface FreePlanCalloutProps {
  onGetStarted: () => void;
  currentSubscription: SubscriptionResponseDtoV2 | null;
}

// Sparkles/Star icon component
const SparklesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  </svg>
);

// Arrow right icon
const ArrowRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const FreePlanCallout: React.FC<FreePlanCalloutProps> = ({ onGetStarted, currentSubscription }) => {
  const { t } = useTranslation();

  // Check if user has a paid subscription (anything other than free or no subscription)
  const hasPaidSubscription = currentSubscription?.plan && 
    currentSubscription.plan.toLowerCase() !== 'free';

  // Check if user is already on free plan
  const isOnFreePlan = !currentSubscription?.plan || 
    currentSubscription.plan.toLowerCase() === 'free';

  // Color mode values
  const bgColor = useColorModeValue('zinc.50', 'zinc.800/50');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');
  const iconBgColor = useColorModeValue('zinc.100', 'zinc.700');
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');

  return (
    <Box
      w="full"
      px={{ base: 4, md: 5 }}
      py={4}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      bg={bgColor}
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'flex-start', md: 'center' }}
        justify="space-between"
        gap={{ base: 4, md: 4 }}
      >
        {/* Left side - Icon and Text */}
        <Flex align="center" gap={3}>
          {/* Icon container */}
          <Box
            w="40px"
            h="40px"
            borderRadius="lg"
            bg={iconBgColor}
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            color={textColor}
          >
            <SparklesIcon />
          </Box>

          {/* Text block */}
          <Box>
            <Flex align="center" gap={2}>
              <Text fontWeight="semibold" fontSize="sm" color={textColor}>
                Free Plan
              </Text>
              <Text fontSize="sm" color={mutedTextColor}>
                {t('profile:for_testing')}
              </Text>
            </Flex>
            <Text fontSize="sm" color={mutedTextColor}>
              <Text as="span" fontWeight="semibold" color={textColor}>
                {FREE_PLAN.credits} {t('profile:credits')}
              </Text>
              {' • '}
              {FREE_PLAN.equivalence.images} {t('profile:images')}
              {' • '}
              {t('profile:non_commercial')}
            </Text>
          </Box>
        </Flex>

        {/* Right side - Button */}
        {isOnFreePlan ? (
          <Button
            h="40px"
            px={4}
            borderRadius="lg"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor={useColorModeValue('zinc.300', 'zinc.600')}
            bg="transparent"
            color={useColorModeValue('zinc.400', 'zinc.500')}
            fontSize="sm"
            fontWeight="normal"
            cursor="default"
            isDisabled
            _disabled={{
              opacity: 0.8,
              cursor: 'default',
            }}
          >
            {t('common:current_plan')}
          </Button>
        ) : (
          <Button
            h="40px"
            px={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={useColorModeValue('zinc.300', 'zinc.600')}
            bg={useColorModeValue('white', 'transparent')}
            color={useColorModeValue('zinc.900', 'white')}
            fontSize="sm"
            fontWeight="medium"
            rightIcon={hasPaidSubscription ? undefined : <ArrowRightIcon />}
            _hover={{
              bg: useColorModeValue('zinc.50', 'zinc.700'),
            }}
            onClick={onGetStarted}
          >
            {hasPaidSubscription ? t('common:downgrade') : t('profile:get_started_free')}
          </Button>
        )}
      </Flex>
    </Box>
  );
};



