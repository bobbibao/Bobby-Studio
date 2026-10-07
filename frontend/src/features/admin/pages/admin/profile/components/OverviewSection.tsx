import {
  SimpleGrid,
  Box,
  Tag,
  Text,
  Progress,
  Stat,
  StatNumber,
  StatArrow,
  StatHelpText,
  Flex,
  useBoolean,
  useColorMode,
  Grid,
  GridItem,
  useColorModeValue,
  Divider,
  Button,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ProfileChart } from './ProfileChart';
import { selectCurrentUser } from '@/selectors/user';
import { useSelector } from 'react-redux';
import * as usageAPI from '@/features/user';
import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@/utils/currency';
import { UsageStatisticsDto } from '@/features/admin/pages/admin/profile/types/usageStatistics.dto';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import ButtonCommon from '@/shared/buttons/Button';
import { ModalCancelSubscription } from '@/features/admin/pages/admin/profile/components/ModalCancelSubscription';
import { FREE_USER_MAX_CREDIT } from '@/configs/stripe.config';
import { FREE_USER_ROLE } from '@/configs/roles.config';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import { API } from '@/actions/favorite';
import { InputTypeEnum } from '@/constants/attribute-enum';
import { ImageWithPlaceholder } from '@/components/ImageWithPlaceholder';
import { capitalize } from '@/utils';

export function OverviewSection() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const dispatch = useAppDispatch();

  const { user: currentUser } = useSelector(selectCurrentUser);
  const [usageStats, setUsageStats] = useState<UsageStatisticsDto>();
  const [modalCancelSubscription, toggleModalCancelSubscription] = useBoolean();
  const { colorMode } = useColorMode();

  // Shared Card Styles - ALL hooks must be at top level
  const bgGradient = useColorModeValue('linear(to-br, white, zinc.50)', 'linear(to-br, whiteAlpha.200, whiteAlpha.50)');
  const cardBg = useColorModeValue('white', 'transparent');
  const borderColor = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const subscriptionDateBg = useColorModeValue('zinc.100', 'zinc.800');
  const hoverBorderColor = useColorModeValue('zinc.300', 'whiteAlpha.400');
  const hoverStyles = {
    borderColor: hoverBorderColor,
    boxShadow: 'none',
  };
  
  // Image grid box background (used inside .map())
  const imageBoxBg = useColorModeValue('zinc.100', 'zinc.800');
  
  // Progress bar backgrounds
  const progressBg = useColorModeValue('zinc.100', 'whiteAlpha.100');
  
  // Stat arrow and text colors
  const statIncreaseColor = useColorModeValue('primary.500', 'white');

  // New stats state
  const [editedImagesCount, setEditedImagesCount] = useState<number>(0);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [recentCreatedImages, setRecentCreatedImages] = useState<any[]>([]);
  const [recentEditedImages, setRecentEditedImages] = useState<any[]>([]);
  
  // Use subscription from Redux state (loaded on login)
  const currentSubscription = currentUser?.subscription;

  useEffect(() => {
    const initData = async () => {
      await Promise.allSettled([fetchUsageStats(), fetchExtendedStats(), fetchCurrentUser()]);
    };
    initData();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const data = await usageAPI.getUsageStatistics();
      console.log('usage stats', data);
      setUsageStats(data);
    } catch (error) {
      console.error('Error fetching usage stats', error);
    }
  };

  const fetchExtendedStats = async () => {
    try {
      const generateInputTypes = [
        InputTypeEnum.TEXT_PROMPT,
        InputTypeEnum.LINE_DRAWING,
        InputTypeEnum.REFERENCE,
        InputTypeEnum.MODEL_3D,
      ];

      const editInputTypes = [
        InputTypeEnum.UPSCALE,
        InputTypeEnum.object_removal,
        InputTypeEnum.inpainting,
        InputTypeEnum.extend,
        InputTypeEnum.ai_style,
      ];

      // Fetch Recent Created Images (Limit 3)
      const createdRes = await API.getDataImages({
        page: 1,
        limit: 3,
        orderBy: 'desc',
        inputType: generateInputTypes,
      });
      if (createdRes?.data?.data) {
        setRecentCreatedImages(createdRes.data.data);
      }

      // Fetch Recent Edited Images (Limit 3)
      const editedRes = await API.getDataImages({
        page: 1,
        limit: 3,
        orderBy: 'desc',
        inputType: editInputTypes,
      });
      if (editedRes?.data?.data) {
        setRecentEditedImages(editedRes.data.data);
        setEditedImagesCount(editedRes.data.total || 0);
      }

      // Video count (Mock or fetch if available)
      setVideoCount(0);
    } catch (error) {
      console.error('Error fetching extended stats', error);
    }
  };

  const handleCancelSubscriptionSuccess = async () => {
    // Refresh usage stats and user data (which includes subscription)
    await fetchUsageStats();
    await dispatch(fetchCurrentUser());
  };

  const price = currentSubscription?.amount ? (currentSubscription.amount / 100).toFixed(0) : 0;
  // Subscription credits
  const credit = currentUser?.totalCredits || 0;
  const usedCredit = currentUser?.usedCredits || 0;

  const creditUsagePercent = credit > 0 ? (usedCredit / credit) * 100 : 0;

  // Extra purchased credits (from credit packs)
  const extraCredit = currentSubscription?.extraCredit || 0;
  const usedExtraCredit = currentSubscription?.usedExtraCredit || 0;
  const extraCreditUsagePercent = extraCredit > 0 ? (usedExtraCredit / extraCredit) * 100 : 0;
  const hasExtraCredits = extraCredit > 0;
  const planType = currentSubscription?.plan || FREE_USER_ROLE;
  const isPro = planType === 'pro' || planType === 'PRO';

  const renderDate = useCallback(() => {
    if (!currentSubscription?.cancelDate && !currentSubscription?.nextRenewDate) return;

    let cancelDate = 'N/A';
    const renewalDate = currentSubscription?.nextRenewDate
      ? format(new Date(currentSubscription.nextRenewDate.toString()), 'dd/MM/yyyy')
      : 'N/A';
    if (currentSubscription?.cancelDate) {
      cancelDate = new Date(currentSubscription.cancelDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return (
      <Text
        bg={subscriptionDateBg}
        px={3}
        py={1}
        borderRadius="md"
        fontSize="xs"
        w="fit-content"
        borderWidth="1px"
        borderColor="transparent"
        _dark={{
          borderColor: 'whiteAlpha.100',
        }}
      >
        {currentSubscription?.cancelDate
          ? t(`profile:expire_at`, { cancelDate })
          : t(`profile:renew_on`, { renewalDate })}
      </Text>
    );
  }, [currentSubscription, t]);

  const StatBox = ({
    title,
    value,
    subtext,
    chart,
  }: {
    title: string;
    value: number | string;
    subtext?: React.ReactNode;
    chart?: React.ReactNode;
  }) => (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="20px"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      p="6"
      gap="2"
      height="100%"
      bg={useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(15, 17, 26, 0.85)')}
      backdropFilter="blur(16px)"
      transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        borderColor: useColorModeValue('rgba(127, 86, 217, 0.45)', 'rgba(139, 92, 246, 0.5)'),
        transform: 'translateY(-2px)',
        boxShadow: '0 16px 32px -10px rgba(127, 86, 217, 0.18)',
      }}
      justifyContent="space-between"
    >
      <Flex align="center" justify="space-between">
        <Text fontSize="xs" fontWeight="700" color="text.muted" textTransform="uppercase" letterSpacing="0.05em">
          {title}
        </Text>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg="brand.400"
          boxShadow="0 0 8px rgba(127, 86, 217, 0.8)"
        />
      </Flex>
      <Flex direction="row" justify="space-between" align="flex-end" flex={1} w="full">
        <Stat gap="1">
          <StatNumber fontSize="34px" fontWeight="800" letterSpacing="-0.03em" color="text.primary">
            {value}
          </StatNumber>
          {subtext && <StatHelpText mb={0}>{subtext}</StatHelpText>}
        </Stat>
        {chart}
      </Flex>
    </Box>
  );

  const ImageGridBox = ({ title, images }: { title: string; images: any[] }) => (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="20px"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      p="6"
      gap="3"
      height="100%"
      bg={useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(15, 17, 26, 0.85)')}
      backdropFilter="blur(16px)"
      transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        borderColor: useColorModeValue('rgba(127, 86, 217, 0.45)', 'rgba(139, 92, 246, 0.5)'),
        transform: 'translateY(-2px)',
        boxShadow: '0 16px 32px -10px rgba(127, 86, 217, 0.18)',
      }}
    >
      <Flex align="center" justify="space-between">
        <Text fontSize="xs" fontWeight="700" color="text.muted" textTransform="uppercase" letterSpacing="0.05em">
          {title}
        </Text>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg="brand.400"
          boxShadow="0 0 8px rgba(127, 86, 217, 0.8)"
        />
      </Flex>
      <SimpleGrid columns={3} gap={4} h="full">
        {images.length > 0 ? (
          images.map((img, idx) => (
            <Box
              key={idx}
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              bg={imageBoxBg}
              aspectRatio="1/1"
            >
              <ImageWithPlaceholder
                imageKey={img?.value?.key}
                thumbnail={true}
                format="webp"
                dimensions={img?.value?.dimensions || '500x500'}
                w="full"
                h="full"
                objectFit="cover"
                loading="lazy"
                imageUrl={img?.value?.path}
                thumbnailUrl={img?.value?.thumbnail}
              />
            </Box>
          ))
        ) : (
          <Flex gridColumn="1 / -1" h="100px" align="center" justify="center" color="zinc.400" fontSize="sm">
            {t('notification:no_image_yet')}
          </Flex>
        )}
      </SimpleGrid>
    </Box>
  );

  // Styles for Manage Payment button to match subscription page
  const managePaymentBg = useColorModeValue('black', 'white');
  const managePaymentColor = useColorModeValue('white', 'black');
  const managePaymentHoverBg = useColorModeValue('black', 'white');

  // Styles for Cancel Plan button to match subscription page
  const cancelPlanBg = useColorModeValue('transparent', 'black');
  const cancelPlanColor = useColorModeValue('black', 'white');
  const cancelPlanBorderColor = useColorModeValue('black', 'whiteAlpha.300');

  return (
    <Box pb={8}>
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
        {/* Subscription Box - 2x2 - Futuristic Cybernetic Card */}
        <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={{ base: 1, lg: 2 }}>
          <Box
            display="flex"
            flexDirection="column"
            borderRadius="24px"
            borderWidth="1px"
            borderColor={borderColor}
            overflow="hidden"
            p="6"
            gap="5"
            height="100%"
            bg={useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(15, 17, 26, 0.85)')}
            backdropFilter="blur(20px)"
            transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            _hover={{
              borderColor: useColorModeValue('rgba(127, 86, 217, 0.45)', 'rgba(139, 92, 246, 0.5)'),
              boxShadow: '0 20px 40px -10px rgba(127, 86, 217, 0.2)',
            }}
            justifyContent="space-between"
          >
            <Box flex={1} display="flex" flexDirection="column">
              {/* Plan Icon/Badge Area */}
              <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    px={2.5}
                    py={0.5}
                    rounded="full"
                    bg={useColorModeValue('rgba(127, 86, 217, 0.1)', 'rgba(139, 92, 246, 0.18)')}
                    border="1px solid"
                    borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.35)')}
                    fontSize="2xs"
                    fontWeight="700"
                    color="brand.400"
                    letterSpacing="0.06em"
                    textTransform="uppercase"
                  >
                    ✦ Active Tier
                  </Box>
                  <Text fontSize="2xl" fontWeight="800" letterSpacing="-0.02em" color="text.primary">
                    {capitalize(planType === 'PRO' ? 'Pro' : planType)}
                  </Text>
                </Box>
                <Box>{renderDate()}</Box>
              </Box>

              {/* Price Section */}
              <Box mb={5} display="flex" flexDirection="column" justifyContent="flex-start">
                <Flex align="baseline">
                  <Text fontSize="4xl" fontWeight="800" letterSpacing="-0.03em" color="text.primary">
                    {formatCurrency(Number(price), i18n.language)}
                  </Text>
                  <Text fontSize="sm" color="text.muted" ml={1.5} fontWeight="600">
                    /{i18n.language.startsWith('vi') ? 'tháng' : 'month'}
                  </Text>
                </Flex>
              </Box>

              {/* Credit Usage Section */}
              <Flex direction="column" gap={hasExtraCredits ? 3 : 2} mb={5}>
                {/* Subscription Credits */}
                <Flex direction="column" gap={2}>
                  <Flex justify="space-between" align="center">
                    <Text fontSize="xs" fontWeight="600" color="text.muted">
                      {hasExtraCredits ? translatorProfileNS('subscription_credits') : translatorProfileNS('credits')}
                    </Text>
                    <Text color="text.primary" fontSize="xs" fontWeight="700">
                      {(currentUser?.role ?? '') === FREE_USER_ROLE
                        ? `${usedCredit ?? 0} / ${credit ?? 0}`
                        : `${usedCredit ?? 0} / ${credit ?? 0} ${translatorProfileNS('credits')}`}
                    </Text>
                  </Flex>
                  <Progress
                    value={creditUsagePercent}
                    size="sm"
                    h={2.5}
                    borderRadius="full"
                    bg={useColorModeValue('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)')}
                    sx={{
                      '& > div[role="progressbar"]': {
                        background: 'linear-gradient(90deg, #7F56D9 0%, #6366F1 100%)',
                        borderRadius: 'full',
                      },
                    }}
                  />
                </Flex>

                {/* Extra Purchased Credits */}
                {hasExtraCredits && (
                  <Flex direction="column" gap={2}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="xs" fontWeight="600" color="text.muted">
                        {translatorProfileNS('purchased_credits')}
                      </Text>
                      <Text color="text.primary" fontSize="xs" fontWeight="700">
                        {usedExtraCredit} / {extraCredit} {translatorProfileNS('credits')}
                      </Text>
                    </Flex>
                    <Progress
                      value={extraCreditUsagePercent}
                      size="sm"
                      h={2.5}
                      borderRadius="full"
                      bg={useColorModeValue('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)')}
                      sx={{
                        '& > div[role="progressbar"]': {
                          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                          borderRadius: 'full',
                        },
                      }}
                    />
                  </Flex>
                )}
              </Flex>

              {/* Button Section */}
              <Flex direction={{ base: 'column', sm: 'row' }} gap={3} mt="auto" w="full">
                <Button
                  flex={1}
                  background="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)"
                  color="white"
                  borderRadius="full"
                  h="46px"
                  minH="46px"
                  px={5}
                  _hover={{
                    opacity: 0.92,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 20px -4px rgba(127, 86, 217, 0.45)',
                  }}
                  transition="all 0.2s"
                  fontWeight="700"
                  fontSize="sm"
                  onClick={() => {
                    navigate('/profile#subscription');
                  }}
                >
                  {t('common:manage_subscription')}
                </Button>

                {currentSubscription && (
                  <Button
                    flex={{ base: '1', sm: 'initial' }}
                    variant="outline"
                    borderRadius="full"
                    h="46px"
                    minH="46px"
                    px={5}
                    borderColor={useColorModeValue('rgba(0, 0, 0, 0.12)', 'rgba(255, 255, 255, 0.15)')}
                    color="text.primary"
                    _hover={{
                      bg: useColorModeValue('red.50', 'rgba(239, 68, 68, 0.1)'),
                      borderColor: 'red.400',
                      color: 'red.400',
                      transform: 'translateY(-1px)',
                    }}
                    transition="all 0.2s"
                    fontWeight="600"
                    fontSize="sm"
                    onClick={() => toggleModalCancelSubscription.on()}
                  >
                    {t('common:cancel_plan')}
                  </Button>
                )}
              </Flex>
            </Box>
          </Box>
        </GridItem>

        {/* Generated Images - 2x1 */}
        <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={1}>
          <StatBox
            title={translatorProfileNS('generated_images')}
            value={usageStats ? usageStats.generatedImages : 0}
            subtext={
              usageStats && (
                <>
                  <StatArrow
                    type={usageStats.growthPercentage >= 0 ? 'increase' : 'decrease'}
                    color={statIncreaseColor}
                  />
                  <Text as="span" color={statIncreaseColor} fontWeight="semibold">
                    {Math.abs(usageStats.growthPercentage).toFixed(0)}%
                  </Text>
                  <Text as="span" p={1} fontSize="sm" color="zinc.600" _dark={{ color: 'zinc.400' }}>
                    {translatorProfileNS('from_last_month')}
                  </Text>
                </>
              )
            }
            chart={
              <Box width="120px">
                <ProfileChart />
              </Box>
            }
          />
        </GridItem>

        {/* Edited Images - 1x1 */}
        <GridItem colSpan={{ base: 1, lg: 1 }} rowSpan={1}>
          <StatBox
            title={translatorProfileNS('edited_images')}
            value={editedImagesCount}
          />
        </GridItem>

        {/* Created Videos - 1x1 */}
        <GridItem colSpan={{ base: 1, lg: 1 }} rowSpan={1}>
          <StatBox title={translatorProfileNS('created_videos')} value={videoCount} />
        </GridItem>

        {/* Recently Created Images - 2x1 */}
        <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={1}>
          <ImageGridBox
            title={ translatorProfileNS('recently_created_images')}
            images={recentCreatedImages}
          />
        </GridItem>

        {/* Recently Edited Images - 2x1 */}
        <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={1}>
          <ImageGridBox
            title={translatorProfileNS('recently_edited_images')}
            images={recentEditedImages}
          />
        </GridItem>
      </Grid>
      <ModalCancelSubscription
        open={modalCancelSubscription}
        onClose={() => {
          toggleModalCancelSubscription.off();
        }}
        onSuccess={handleCancelSubscriptionSuccess}
      />
    </Box>
  );
}



