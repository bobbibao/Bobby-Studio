import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Divider,
  Radio,
  RadioGroup,
  useColorModeValue,
  useToast,
  Box,
  Center,
  useBoolean,
} from '@chakra-ui/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { useParams } from 'react-router-dom';
import * as subscriptionAPI from '@/features/user';
import StripeCardForm, { StripeCardFormRef } from './components/StripeCardForm';
import VisaIcon from '@/shared/icons/VisaIcon';
import MasterCardIcon from '@/shared/icons/MasterCardIcon';
import StripeIcon from '@/shared/icons/StripeIcon';
import Stripe from 'stripe';
import { useQueryParamsURL } from '@/hooks/useQueryParamsURL';
import { useTranslation } from 'react-i18next';

type PaymentMethod = 'visa' | 'mastercard' | 'stripe';
const DefaultPaymentMethod = 'stripe';

const COLORS = {
  SUBTITLE: '#6C757D',
  DARK_TEXT: '#212529',
  LIGHT_TEXT: '#FFFFFF',
  BUTTON: {
    bg: '#111113',
    text: '#FFFFFF',
    bg_dark: '#FFFFFF',
    text_dark: '#111113',
  },
  BORDER: {
    light: '#E0E0E0',
    dark: '#2E2E2E',
  },
  RADIO: '#111113',
  CARD: {
    bgDark: '#0E0E0E',
    bgLight: '#FFFFFF',
  },
};

const FONTS = {
  heading: {
    fontSize: 'xl',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 'md',
    fontWeight: '400',
  },
  price: {
    fontSize: 'md',
    fontWeight: '700',
  },
  button: {
    fontSize: 'md',
    fontWeight: '400',
  },
};

const STYLES = {
  card: {
    border: {
      width: '1px',
      radius: '12px',
    },
    padding: '24px',
  },
  inner: {
    border: {
      width: '1px',
      radius: '8px',
    },
    padding: '16px',
  },
  icon: {
    height: '40px',
    width: '58px',
    border: {
      width: '1px',
      radius: '6px',
    },
    padding: '10px',
  },
};

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function PaymentDetail() {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(DefaultPaymentMethod);
  const params = useParams<{ priceId?: string }>();
  const query = useQueryParamsURL();
  const priceId = params.priceId || '';
  const toast = useToast();
  const stripeFormRef = useRef<StripeCardFormRef>(null);
  const [price, setPrice] = useState<Stripe.Price | null>(null);
  const [urlResponse, setUrlResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const colors = {
    background: useColorModeValue('white', 'gray.800'),
    heading: useColorModeValue(COLORS.DARK_TEXT, COLORS.LIGHT_TEXT),
    subtitle: COLORS.SUBTITLE,
    price: useColorModeValue(COLORS.DARK_TEXT, COLORS.LIGHT_TEXT),
    border: useColorModeValue(COLORS.BORDER.light, COLORS.BORDER.dark),
    cardBackground: useColorModeValue(COLORS.CARD.bgLight, COLORS.CARD.bgDark),
  };
  const [modalNotiSuccess, toggleModalNotiSuccess] = useBoolean();

  useEffect(() => {
    const fetchPrice = async (priceId: string) => {
      try {
        const priceResponse = await subscriptionAPI.getPrice(priceId);
        setPrice(priceResponse);
      } catch (error) {
        console.error('Error fetching price:', error);
        toast({
          title: translatorNotificationNS('error'),
          description: translatorNotificationNS('failed_to_fetch_price_details'),
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    if (priceId) {
      fetchPrice(priceId);
    }
  }, [priceId]);

  if (!priceId) {
    return <>{translatorProfileNS('price_not_found')}</>;
  }

  const handleUpgradeStripePlan = async (priceId: string) => {
    try {
      setLoading(true);
      const plan: any = query.get('plan') || undefined;
      const resp = await subscriptionAPI.upgradeSubscription(priceId, plan);
      setUrlResponse(resp.url);
      window.location.href = resp.url;
    } catch (error) {
      toast({
        title: translatorNotificationNS('upgrade_plan'),
        description: translatorNotificationNS('something_went_wrong_when_upgrading_plan'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (selectedMethod === 'stripe') {
      await handleUpgradeStripePlan(priceId);
    } else if (selectedMethod === 'visa' || selectedMethod === 'mastercard') {
      stripeFormRef.current?.triggerSubmit(); // 🟢 Trigger submit từ ngoài
    } else {
      alert('Please select a payment method.');
    }
  };

  const handleSubmitStripeFormCallback = async () => {
    alert('handleSubmitStripeFormCallback');
  };

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)] dark:!bg-[transparent] p-6">
      <div className="md:grid-cols-2 grid w-full max-w-4xl grid-cols-1 gap-6">
        <Card
          borderWidth={STYLES.card.border.width}
          borderColor={colors.border}
          borderRadius={STYLES.card.border.radius}
          p={STYLES.card.padding}
          bg={colors.cardBackground}
        >
          <CardBody p="0">
            <Heading size="md" mb={4} color={colors.heading} {...FONTS.heading} _dark={{ color: COLORS.LIGHT_TEXT }}>
              {translatorProfileNS('payment_method')}
            </Heading>
            <Text color={colors.subtitle} mb={4} {...FONTS.subtitle} _dark={{ color: '#A0A0A0' }}>
              {translatorProfileNS('manage_and_customize_your_payment_preferences_for_seamless_transactions')}
            </Text>
            <RadioGroup onChange={(value) => setSelectedMethod(value as PaymentMethod)} value={selectedMethod || ''}>
              <HStack spacing={6} className="flex-wrap">
                {/* <Radio value="visa">
                  <HStack>
                    <Center
                      h={STYLES.icon.height}
                      w={STYLES.icon.width}
                      borderWidth={STYLES.icon.border.width}
                      borderColor={colors.border}
                      borderRadius={STYLES.icon.border.radius}
                      p={STYLES.icon.padding}
                    >
                      <VisaIcon />
                    </Center>
                  </HStack>
                </Radio>
                <Radio value="mastercard">
                  <HStack>
                    <Center
                      h={STYLES.icon.height}
                      w={STYLES.icon.width}
                      borderWidth={STYLES.icon.border.width}
                      borderColor={colors.border}
                      borderRadius={STYLES.icon.border.radius}
                      p={STYLES.icon.padding}
                    >
                      <MasterCardIcon />
                    </Center>
                  </HStack>
                </Radio> */}
                <Radio value="stripe">
                  <HStack>
                    <Center
                      h={STYLES.icon.height}
                      w={STYLES.icon.width}
                      borderWidth={STYLES.icon.border.width}
                      borderColor={colors.border}
                      borderRadius={STYLES.icon.border.radius}
                      p={STYLES.icon.padding}
                    >
                      <StripeIcon />
                    </Center>
                  </HStack>
                </Radio>
              </HStack>
            </RadioGroup>
            {selectedMethod && selectedMethod !== 'stripe' && stripePromise && (
              <Elements stripe={stripePromise}>
                <StripeCardForm priceId={priceId} onSubmit={handleSubmitStripeFormCallback} ref={stripeFormRef} />
              </Elements>
            )}
          </CardBody>
        </Card>

        {/* Payment Summary */}
        <Card
          borderWidth={STYLES.card.border.width}
          borderColor={colors.border}
          borderRadius={STYLES.card.border.radius}
          p={STYLES.card.padding}
          bg={colors.cardBackground}
        >
          <CardBody p="0">
            {' '}
            {/* Reset CardBody padding since we're using Card padding */}
            <Heading size="md" mb={4} color={colors.heading} {...FONTS.heading} _dark={{ color: COLORS.LIGHT_TEXT }}>
              {translatorProfileNS('summary')}
            </Heading>
            <Text color={colors.subtitle} mb={4} {...FONTS.subtitle} _dark={{ color: '#A0A0A0' }}>
              {translatorProfileNS('heres_a_snapshot_of_everything_you_need_to_know_at_a_glance')}
            </Text>
            <Box
              borderWidth={STYLES.inner.border.width}
              borderColor={colors.border}
              borderRadius={STYLES.inner.border.radius}
              p={STYLES.inner.padding}
            >
              <VStack spacing={3} align="start">
                <HStack w="full" justify="space-between">
                  <Text id="subtitle-cost1" color={colors.subtitle} {...FONTS.subtitle} _dark={{ color: '#A0A0A0' }}>
                    {price?.recurring?.interval === 'month'
                      ? translatorProfileNS('monthly_cost')
                      : translatorProfileNS('yearly_cost')}
                    :
                  </Text>
                  <Text id="price-1" color={colors.price} {...FONTS.price} _dark={{ color: COLORS.LIGHT_TEXT }}>
                    CHF{price ? ((price.unit_amount ?? 0) / 100).toFixed(2) : t('common:loading')}
                  </Text>
                </HStack>
                {/*<HStack w="full" justify="space-between">
                  <Text
                    id="subtitle-cost2"
                    color={colors.subtitle}
                    {...FONTS.subtitle}
                  >
                    Add discount:
                  </Text>
                  <Text color={colors.price} {...FONTS.price}></Text>
                </HStack>
                <HStack w="full" justify="space-between">
                  <Text
                    id="subtitle-cost2"
                    color={colors.subtitle}
                    {...FONTS.subtitle}
                  >
                    VAT (10%):
                  </Text>
                  <Text id="price-2" color={colors.price} {...FONTS.price}>
                    $
                    {price
                      ? ((price.unit_amount * 0.1) / 100).toFixed(2)
                      : t('common:loading')}
                  </Text>
                </HStack> */}
                <Divider />
                <HStack w="full" justify="space-between">
                  <Text id="subtitle-cost3" color={colors.subtitle} {...FONTS.subtitle} _dark={{ color: '#A0A0A0' }}>
                    {translatorProfileNS('total')}:
                  </Text>
                  <Text id="price-3" color={colors.price} {...FONTS.price} _dark={{ color: COLORS.LIGHT_TEXT }}>
                    CHF{price ? ((price.unit_amount ?? 0) / 100).toFixed(2) : t('common:loading')}
                  </Text>
                </HStack>
              </VStack>
            </Box>
            <Button
              colorScheme="primary"
              size="lg"
              w="full"
              mt={6}
              borderRadius="xl"
              onClick={handlePayNow}
              isDisabled={!price}
              bg={COLORS.BUTTON.bg}
              color={COLORS.BUTTON.text}
              _dark={{ bg: COLORS.BUTTON.bg_dark, color: COLORS.BUTTON.text_dark }}
              {...FONTS.button}
              _hover={{
                bg: COLORS.BUTTON.bg,
                opacity: 0.9,
              }}
              _active={{
                bg: COLORS.BUTTON.bg,
                opacity: 0.8,
              }}
              isLoading={loading}
            >
              {translatorProfileNS('pay_now')}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}




