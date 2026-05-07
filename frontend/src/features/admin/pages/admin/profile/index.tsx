import React, { useEffect, useState } from 'react';
import { Tab, TabList, Tabs, Flex, Button, Box } from '@chakra-ui/react';
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

// Danh sách tab với nhiều hash
const PROFILE_TABS = [
  {
    index: 0,
    hash: ['overview'],
    label: 'Overview',
    component: OverviewSection,
  },
  {
    index: 1,
    hash: ['subscription', 'billing'],
    label: 'Subscription',
    component: SubscriptionSection,
  },
  {
    index: 2,
    hash: ['company', 'business-info', 'company-create'],
    label: 'Organization',
    component: CompanySection,
  },
  {
    index: 3,
    hash: ['team', 'members'],
    label: 'Team',
    component: TeamSection,
  },
  {
    index: 4,
    hash: ['my-account', 'account-settings'],
    label: 'Profile',
    component: MyAccountSection,
  },
  {
    index: 5,
    hash: ['privacy', 'data-settings'],
    label: 'Privacy',
    component: PrivacySection,
  },
];

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useSelector((state: RootState) => state.currentUser);
  const role = currentUser?.role;
  const plan = currentUser?.subscription?.plan;

  // Lọc danh sách tab dựa trên role - Team tab is hidden by default, only shown for TEAM role
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
      // window.location.href = `/profile#${selectedTab.hash[0]}`;
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
    <Flex direction={'column'} paddingTop={4} paddingBottom={0} height={'100%'} overflowY={'hidden'} gap={5}>
      <Box position="relative">
        <Tabs index={selectedTabIndex} onChange={handleTabChange} px={4} w="calc(100% - 106px)">
          <TabList>
            {filteredTabs.map((tab, index) => (
              <Tab
                key={index}
                fontSize="15px"
                fontWeight={selectedTabIndex === index ? 'semibold' : 'normal'}
                color={selectedTabIndex === index ? 'primary' : 'secondary'}
                _dark={{
                  color: selectedTabIndex === index ? 'white' : '#bababa',
                }}
                transition="colors 0.3s"
              >
                {t(`profile:${tab.label.toLocaleLowerCase().replace(/ /g, '_').replace('&', '')}`)}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Box position="absolute" right={4} top={1}>
          <Button
            variant="outline"
            borderRadius="lg"
            h={9}
            fontWeight="normal"
            borderColor="borderPrimary"
            _dark={{
              bg: 'transparent',
            }}
            onClick={handleLogout}
          >
            {t('common:logout')}
          </Button>
        </Box>
      </Box>
      <Box h="full" px={4} pb={0} overflowY="auto">
        {SelectedComponent && <SelectedComponent key={location.hash} />}
      </Box>
    </Flex>
  );
};

export default Profile;



