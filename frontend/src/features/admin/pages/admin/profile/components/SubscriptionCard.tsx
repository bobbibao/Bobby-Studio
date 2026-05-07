import { Box, Badge, Flex, Text, Progress, AvatarGroup, Avatar, useColorModeValue, useBoolean } from '@chakra-ui/react';
import DollarIcon2 from '@/shared/icons/DollarIcon2';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalCancelSubscription } from '@/features/admin/pages/admin/profile/components/ModalCancelSubscription';
import Button from '@/shared/buttons/Button';
import { useTranslation } from 'react-i18next';
import { SubscriptionResponseDtoV2 } from '@/types/subscriptionResponse.dto';
import { StripePricingResponseDTO } from '@/types/StripePricingResponse.dto';

type User = {
  name: string;
  bgColor: string;
};

interface SubscriptionCardProps {
  id: string;
  plan: string;
  renewalDate: string;
  price: number;
  users: User[];
  maxUsers: number;
  creditsUsed: number;
  totalCredits: number;
  buttonText: string;
  isCurrentPlan: boolean;
  productDescription?: string;
  interval: string;
  currentPlan: {
    planActive: StripePricingResponseDTO | null;
    subscription: SubscriptionResponseDtoV2 | null;
  };
  callback?: () => void;
}

export default function SubscriptionCard({
  id,
  plan,
  renewalDate,
  price,
  users,
  maxUsers,
  creditsUsed,
  totalCredits,
  buttonText,
  isCurrentPlan,
  productDescription,
  currentPlan,
  callback,
  interval,
}: SubscriptionCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modalCancelSubscription, toggleModalCancelSubscription] = useBoolean();
  const priceTextClass = 'text-[32px] font-bold leading-[1.1] tracking-[0.03em]';

  const translatorCommonNS = (key: string) => t(`common:${key}`);
  const translatorProfileNS = (key: string) => t(`profile:${key}`);

  // Theme colors
  const themeColors = {
    cardBg: useColorModeValue('#FFFFFF', '#0E0E0E'),
    cardBorderColor: useColorModeValue('#E0E0E0', '#2E2E2E'),
    tagBg: useColorModeValue('#E5E5E5', '#1A1A1A'),
    tagTextColor: useColorModeValue('#111113', '#2E2E2E'),
    secondaryTextColor: useColorModeValue('#6C757D', '#6C757D'),
    primaryTextColor: useColorModeValue('#212529', '#FFFFFF'),
    unitAmountColor: useColorModeValue('#212529', '#FFFFFF'),
    outlineBorderColor: useColorModeValue('#111113', '#2E2E2E'),
    outlineTextColor: useColorModeValue('#111113', '#2E2E2E'),
  };

  // Extracted functions for better readability
  const handleUpgradePlan = () => {
    if (currentPlan.subscription) {
      navigate({
        pathname: '/profile',
        hash: `subscription?plan=${interval === 'monthly' ? 'monthly' : 'annually'}`,
      });
    } else {
      navigate(`/payment-details/${id}`);
    }
  };

  const handleSwitchPlan = () => {
    navigate({
      pathname: '/profile',
      hash: `subscription?plan=monthly`,
    });
  };

  const handleCompare = () => {
    navigate({
      pathname: '/profile',
      hash: `subscription?plan=${interval === 'monthly' ? 'monthly' : 'annually'}`,
    });
  };

  const openCancelSubscriptionModal = () => {
    toggleModalCancelSubscription.on();
  };

  const closeCancelSubscriptionModal = () => {
    toggleModalCancelSubscription.off();
    callback?.();
  };

  // Helper functions to determine card state
  const isDowngradePlan = () => {
    const currentPlanActive = currentPlan.planActive;
    if (!currentPlanActive || !currentPlanActive.unit_amount) return false;

    return currentPlanActive.unit_amount > price;
  };

  const isCancelled = currentPlan.subscription?.cancelDate !== null;
  const isFree = plan.toLowerCase() === 'free';
  const formattedPrice = isFree ? translatorCommonNS('free') : `CHF${(price / 100).toFixed(2)}`;

  // Components for better organization
  const renderHeader = () => {
    let cancelDate = 'N/A';
    if (currentPlan.subscription?.cancelDate) {
      cancelDate = new Date(currentPlan.subscription.cancelDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return (
      <Flex justify="space-between" align="center">
        <Badge
          bg={isCurrentPlan ? 'white' : 'purple.100'}
          color={isCurrentPlan ? 'primary' : 'purple.600'}
          _dark={{
            bg: isCurrentPlan ? '#1F1F1F' : 'purple.900',
            color: isCurrentPlan ? 'white' : 'purple.100',
          }}
          px="3"
          py="2"
          rounded="md"
        >
          <Text fontSize={14}>{translatorCommonNS(plan.toLowerCase())}</Text>
        </Badge>
        {isCurrentPlan && (
          <Text
            className={
              isCurrentPlan
                ? 'bg-white/20 dark:!bg-[#1F1F1F] text-white dark:text-white px-3 py-2 rounded-lg text-sm border border-white/30 dark:border-white/20'
                : 'bg-[#F8F9FA] dark:!bg-[#2A2A2A] px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700'
            }
          >
            {isCancelled ? t(`profile:expire_at`, { cancelDate }) : t(`profile:renew_on`, { renewalDate })}
          </Text>
        )}
      </Flex>
    );
  };

  const renderPricing = () => (
    <Flex justify="space-between" align="center">
      <Flex align="baseline" gap="1">
        <Text className={`${priceTextClass} ${isCurrentPlan ? 'text-white dark:text-primary' : 'text-[#212529] dark:text-white'}`}>
          {formattedPrice}
        </Text>
        {!isFree && (
          <Text className={isCurrentPlan ? 'text-white/80 dark:text-primary/80 text-lg' : 'text-gray-500 text-lg'}>
            /
            {translatorProfileNS(
              interval === 'yearly' ? 'comparison_table.rows.price.unitYear' : 'comparison_table.rows.price.unitMonth'
            ).toLowerCase()}
          </Text>
        )}
      </Flex>

      {maxUsers > 0 && renderUserAvatars()}
    </Flex>
  );

  const renderUserAvatars = () => (
    <Flex align="center" gap={2}>
      <AvatarGroup size="sm" max={3}>
        {users.map((user, index) => (
          <Avatar key={index} name={user.name} bg={user.bgColor} />
        ))}
      </AvatarGroup>
      <Text className={isCurrentPlan ? 'text-white/80 dark:text-primary/80' : 'text-gray-500'}>
        {users.length}/{maxUsers}
      </Text>
    </Flex>
  );

  const renderContentArea = () => <Box className="flex-1">{isCurrentPlan ? renderCreditsProgress() : renderProductDescription()}</Box>;

  const renderCreditsProgress = () => (
    <Flex align="center" gap={2} w="full">
      <Progress
        value={(creditsUsed / totalCredits) * 100}
        size="sm"
        flex="1"
        borderRadius="full"
        bg="#E5E5E5"
        sx={{
          '.chakra-progress__indicator': {
            backgroundColor: isCurrentPlan ? 'rgba(255, 255, 255, 0.8) !important' : undefined,
          },
        }}
        _dark={{
          sx: {
            '.chakra-progress__indicator': {
              backgroundColor: isCurrentPlan ? '#F8F9FA !important' : '#582186 !important',
            },
          },
        }}
      />
      <Text className={isCurrentPlan ? 'text-white dark:text-primary text-sm' : 'text-gray-500 text-sm'}>
        {creditsUsed}/{totalCredits} {translatorCommonNS('credits')}
      </Text>
    </Flex>
  );

  const renderProductDescription = () => {
    const productDescriptionSplit = productDescription?.split(' ');
    const creditNumber = productDescriptionSplit?.[0];
    const creditText = productDescriptionSplit?.[1];

    return (
      <Flex alignItems="center" gap="1">
        <DollarIcon2 />
        <Text
          fontSize="sm"
          className={isCurrentPlan ? 'text-white dark:text-primary' : ''}
          color={isCurrentPlan ? undefined : themeColors.primaryTextColor}
        >
          {creditNumber} {translatorCommonNS(creditText?.toLowerCase() as string)}
        </Text>
      </Flex>
    );
  };

  const renderActionButtons = () => (
    <Flex align="center" gap={4}>
      {isCurrentPlan ? renderCurrentPlanActions() : renderUpgradeActions()}
      {!isCurrentPlan && (
        <Button
          label={translatorCommonNS('compare')}
          extraClass="!bg-primary dark:!bg-white !text-white dark:!text-primary"
          onClick={handleCompare}
        />
      )}
    </Flex>
  );

  const renderCurrentPlanActions = () => {
    return (
      <>
        {!isCancelled && (
          <Text className="text-red-600 dark:text-red-400 cursor-pointer" onClick={openCancelSubscriptionModal}>
            {translatorCommonNS('cancel_plan')}
          </Text>
        )}
        <Button
          label={translatorCommonNS('current_plan')}
          extraClass="!bg-white dark:!bg-primary !text-primary dark:!text-white border border-white dark:border-primary"
          isDisabled
        />
      </>
    );
  };

  const renderUpgradeActions = () =>
    isDowngradePlan() ? (
      <Button
        label={translatorCommonNS('switch_plan')}
        extraClass="!bg-transparent  border border-primary dark:border-[#E0E0E0] !font-normal !hover:bg-transparent"
        onClick={handleSwitchPlan}
      />
    ) : (
      <Button
        label={translatorCommonNS('upgrade')}
        extraClass="!bg-primary dark:!bg-white !text-white dark:!text-primary"
        onClick={handleUpgradePlan}
      />
    );

  return (
    <Box
      key={plan}
      display="flex"
      flexDirection="column"
      rounded="md"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p="6"
      gap="4"
      bg={isCurrentPlan ? '#111113' : 'white/80'}
      _dark={{
        bg: isCurrentPlan ? 'white' : 'black/80',
        borderColor: isCurrentPlan ? 'white' : themeColors.cardBorderColor,
      }}
      borderColor={isCurrentPlan ? '#111113' : themeColors.cardBorderColor}
      className="backdrop-blur-md shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      {renderHeader()}
      {renderPricing()}
      {renderContentArea()}
      {renderActionButtons()}

      <ModalCancelSubscription open={modalCancelSubscription} onClose={closeCancelSubscriptionModal} />
    </Box>
  );
}



