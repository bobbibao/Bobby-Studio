import React, { useEffect, useState } from 'react';
import { Flex, Button, Box, Heading, Text, HStack, useColorModeValue } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '@/store';
import { OverviewSection } from '@/features/admin/pages/admin/profile/components/OverviewSection';
import { MyAccountSection } from '@/features/admin/pages/admin/profile/components/MyAccountSection';
import { CompanySection } from '@/features/admin/pages/admin/profile/components/CompanySection';
import { TeamSection } from '@/features/admin/pages/admin/profile/components/TeamSection';
import { SubscriptionSection } from '@/features/admin/pages/admin/profile/components/SubscriptionSection';
import { PrivacySection } from '@/features/admin/pages/admin/profile/components/PrivacySection';
import { auth } from '@/configs/firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import { TabsCommon } from '@/shared/tabs';
import { SubscriptionPlanMonthly } from '@/features/admin/pages/admin/profile/components/SubscriptionPlanMonthly';
import { SubscriptionPlanAnnually } from '@/features/admin/pages/admin/profile/components/SubscriptionPlanAnnually';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  Users,
  UserCheck,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';

// Tabs, each reachable through several hashes with dedicated futuristic icons
const PROFILE_TABS = [
  {
    index: 0,
    hash: ['overview'],
    label: 'Overview',
    icon: LayoutDashboard,
    component: OverviewSection,
  },
  {
    index: 1,
    hash: ['subscription', 'billing'],
    label: 'Subscription',
    icon: CreditCard,
    component: SubscriptionSection,
  },
  {
    index: 2,
    hash: ['company', 'business-info', 'company-create'],
    label: 'Organization',
    icon: Building2,
    component: CompanySection,
  },
  {
    index: 3,
    hash: ['team', 'members'],
    label: 'Team',
    icon: Users,
    component: TeamSection,
  },
  {
    index: 4,
    hash: ['my-account', 'account-settings'],
    label: 'Profile',
    icon: UserCheck,
    component: MyAccountSection,
  },
  {
    index: 5,
    hash: ['privacy', 'data-settings'],
    label: 'Privacy',
    icon: ShieldCheck,
    component: PrivacySection,
  },
];

const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isViet = i18n.language?.toLowerCase().startsWith('vi');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useSelector((state: RootState) => state.currentUser);
  const role = currentUser?.role;
  const plan = currentUser?.subscription?.plan;

  // Filter tabs by role. The Team tab is hidden by default and only shown for the TEAM role
  const filteredTabs = PROFILE_TABS.filter(
    (tab) => tab.label !== 'Team' || role === 'TEAM' || plan?.toLowerCase() === 'team' || plan?.toLowerCase() === 'pro'
  );

  const getTabIndexFromHash = React.useCallback(() => {
    const fullHash = window.location.hash.replace('#', '');
    const mainHash = fullHash.split('?')[0];
    const tab = filteredTabs.find((t) => t.hash.includes(mainHash));
    return tab ? filteredTabs.indexOf(tab) : 0;
  }, [filteredTabs]);

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(getTabIndexFromHash());
  const [activeTab, setActiveTab] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [selectedSubscriptionTabIndex, setSelectedSubscriptionTabIndex] = useState<number>(0);

  const cardBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const pillInactiveBg = useColorModeValue('rgba(0, 0, 0, 0.03)', 'rgba(255, 255, 255, 0.04)');
  const pillHoverBg = useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.12)');
  const pillActiveBg = useColorModeValue(
    'linear-gradient(135deg, rgba(127, 86, 217, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)',
    'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(99, 102, 241, 0.28) 100%)'
  );
  const pillActiveBorder = useColorModeValue('rgba(127, 86, 217, 0.4)', 'rgba(168, 85, 247, 0.45)');

  useEffect(() => {
    const handleHashChange = () => {
      const index = getTabIndexFromHash();
      setSelectedTabIndex(index);
      const { plan } = parseHashAndQuery();
      setActiveTab(filteredTabs[index].label);
      setSubscriptionPlan(plan || null);
      if (plan) {
        setSelectedSubscriptionTabIndex(plan === 'monthly' ? 0 : 1);
      }
    };
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [filteredTabs, location]);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [location]);

  const handleTabChange = (index: number) => {
    const selectedTab = filteredTabs[index];
    if (selectedTab) {
      setSelectedTabIndex(index);
      navigate({
        pathname: '/profile',
        hash: `${selectedTab.hash[0]}`,
      });
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/auth/sign-in');
    localStorage.removeItem('i18nextLng');
    localStorage.removeItem('i18nextLng_manual');
    window.location.reload();
  };

  const parseHashAndQuery = React.useCallback(() => {
    const hashValue = location.hash.substring(1);

    const [mainHash, queryString] = hashValue.split('?');

    const queryParams: any = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    return {
      tab: mainHash,
      plan: queryParams.plan,
    };
  }, [location]);

  useEffect(() => {
    if (activeTab === 'Subscription' && subscriptionPlan) {
      dispatch(setNavbarHeading('Pricing Plan'));
      dispatch(setNavbarAllowBack(true));
    } else {
      dispatch(setNavbarHeading('Management'));
      dispatch(setNavbarAllowBack(false));
    }
  }, [activeTab, subscriptionPlan, dispatch]);

  if (activeTab === 'Subscription' && subscriptionPlan) {
    return (
      <TabsCommon
        selected={selectedSubscriptionTabIndex}
        onSelect={(i) => {
          navigate(
            {
              pathname: '/profile',
              hash: `subscription?plan=${i === 0 ? 'monthly' : 'annually'}`,
            },
            { replace: true }
          );
          setSelectedSubscriptionTabIndex(i);
        }}
        className="p-4"
        classNamePanels="h-[calc(100vh-176px)] overflow-auto"
        tabs={[
          {
            name: t('profile:monthly'),
            component: <SubscriptionPlanMonthly />,
          },
          {
            name: t('profile:annually'),
            component: <SubscriptionPlanAnnually />,
          },
        ]}
      />
    );
  }

  const SelectedComponent = filteredTabs[selectedTabIndex]?.component;

  return (
    <Flex direction={'column'} paddingTop={2} paddingBottom={0} height={'100%'} overflowY={'hidden'} gap={4}>
      {/* Futuristic Command Header */}
      <Box px={6} pt={2} pb={1} w="full">
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'start', md: 'center' }} gap={4}>
          <Box>
            <Flex align="center" gap={2} mb={1}>
              <Box
                px={2.5}
                py={0.5}
                rounded="full"
                bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.16)')}
                border="1px solid"
                borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.35)')}
                fontSize="2xs"
                fontWeight="700"
                color="brand.400"
                letterSpacing="0.06em"
                textTransform="uppercase"
              >
                ✦ Studio Intelligence & Identity Hub
              </Box>
            </Flex>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" letterSpacing="-0.02em" color="text.primary">
              {isViet ? 'Trung Tâm Quản Lý Tài Khoản & Studio' : 'Account & Studio Management'}
            </Heading>
            <Text fontSize="xs" color="text.muted" mt={0.5}>
              {isViet
                ? 'Thiết lập gói dịch vụ, hạn ngạch tín dụng neural, thông tin tổ chức và bảo mật tài khoản.'
                : 'Configure subscription tiers, neural generation quotas, organization profile, and enterprise security.'}
            </Text>
          </Box>

          <Button
            variant="outline"
            size="sm"
            borderRadius="full"
            h="42px"
            px={5}
            fontWeight="700"
            fontSize="sm"
            leftIcon={<LogOut size={15} />}
            borderColor={useColorModeValue('red.200', 'rgba(239, 68, 68, 0.3)')}
            color={useColorModeValue('red.600', 'red.400')}
            bg={useColorModeValue('red.50', 'rgba(239, 68, 68, 0.08)')}
            _hover={{
              bg: useColorModeValue('red.100', 'rgba(239, 68, 68, 0.18)'),
              borderColor: 'red.400',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
            }}
            transition="all 0.2s ease"
            onClick={handleLogout}
          >
            {t('common:logout')}
          </Button>
        </Flex>
      </Box>

      {/* Futuristic Segmented Pill Tab Bar */}
      <Box px={6} w="full">
        <HStack
          spacing={2}
          overflowX="auto"
          py={1.5}
          sx={{
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {filteredTabs.map((tab, index) => {
            const isSelected = selectedTabIndex === index;
            const TabIcon = tab.icon;
            return (
              <Box
                key={tab.label}
                as="button"
                onClick={() => handleTabChange(index)}
                px={5}
                py={2.5}
                borderRadius="full"
                borderWidth="1px"
                borderColor={isSelected ? pillActiveBorder : cardBorder}
                bg={isSelected ? pillActiveBg : pillInactiveBg}
                color={isSelected ? (useColorModeValue('purple.700', 'white')) : 'text.muted'}
                fontWeight={isSelected ? '700' : '600'}
                fontSize="sm"
                display="flex"
                alignItems="center"
                gap={2}
                cursor="pointer"
                transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                boxShadow={isSelected ? '0 4px 16px -4px rgba(127, 86, 217, 0.3)' : 'none'}
                _hover={{
                  bg: isSelected ? pillActiveBg : pillHoverBg,
                  borderColor: isSelected ? pillActiveBorder : useColorModeValue('rgba(127, 86, 217, 0.3)', 'rgba(168, 85, 247, 0.35)'),
                  color: isSelected ? (useColorModeValue('purple.800', 'white')) : 'text.primary',
                  transform: 'translateY(-1px)',
                }}
              >
                <TabIcon size={14} />
                <span>
                  {t(`profile:${tab.label.toLocaleLowerCase().replace(/ /g, '_').replace('&', '')}`)}
                </span>
                {isSelected && (
                  <Box
                    w={1.5}
                    h={1.5}
                    borderRadius="full"
                    bg="brand.400"
                    boxShadow="0 0 6px rgba(127, 86, 217, 0.9)"
                  />
                )}
              </Box>
            );
          })}
        </HStack>
      </Box>

      {/* Main Tab Viewport */}
      <Box h="full" px={6} pb={4} overflowY="auto">
        {SelectedComponent && <SelectedComponent key={location.hash} />}
      </Box>
    </Flex>
  );
};

export default Profile;



