// PricingTabsGroup.tsx
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import React from 'react';
import { PRICING_PLAN_ENUM, SUBSCRIPTION_TYPE_ENUM } from '../types';
import PricingCard from './PricingCard';
import {
  TERMS_OF_BASIC_MONTHLY,
  TERMS_OF_BASIC_YEARLY,
  TERMS_OF_PRO_MONTHLY,
  TERMS_OF_PRO_YEARLY,
} from '../constants';

interface PricingTabsProps {
  tabPanelClass?: string;
  selectedTabIndex: number;
  setSelectedTabIndex: (index: number) => void;
}

const PricingTabsGroup: React.FC<PricingTabsProps> = ({
  tabPanelClass,
  selectedTabIndex,
  setSelectedTabIndex,
}) => {
  return (
    <Tabs
      index={selectedTabIndex}
      onChange={setSelectedTabIndex}
      variant="unstyled"
    >
      <div className="rounded bg-gray-50 dark:bg-black max-w-[400px] m-auto">
        <TabList className="p-1">
          <Tab
            className={`flex-1 rounded-lg py-2 text-center text-[16px] font-normal dark:text-white ${
              selectedTabIndex === 0 ? 'bg-primary text-white' : ''
            } transition-colors duration-300`}
          >
            {PRICING_PLAN_ENUM.MONTHLY}
          </Tab>
          <Tab
            className={`flex-1 rounded-lg py-2 text-center text-[16px] font-normal dark:text-white ${
              selectedTabIndex === 1 ? 'bg-primary text-white' : ''
            } transition-colors duration-300`}
          >
            {PRICING_PLAN_ENUM.YEARLY}
          </Tab>
        </TabList>
      </div>

      <TabPanels className={`mt-20 flex justify-center ${tabPanelClass}`}>
        <TabPanel key={0} className="flex gap-8 flex-col md:flex-row">
          <PricingCard
            tag="Basic"
            description="Perfect for individual designers or small teams looking to explore AI-powered tools for architecture."
            price="Free"
            type="month"
            subscriptionType={SUBSCRIPTION_TYPE_ENUM.BASIC}
            terms={TERMS_OF_BASIC_MONTHLY}
          />
          <PricingCard
            tag="Pro"
            description="Perfect for individual designers or small teams looking to explore AI-powered tools for architecture."
            price="$49.99"
            type="month"
            subscriptionType={SUBSCRIPTION_TYPE_ENUM.PRO}
            terms={TERMS_OF_PRO_MONTHLY}
          />
        </TabPanel>

        <TabPanel key={1} className="flex gap-8 flex-col md:flex-row">
          <PricingCard
            tag="Basic"
            description="Perfect for individual designers or small teams looking to explore AI-powered tools for architecture."
            price="Free"
            type="year"
            subscriptionType={SUBSCRIPTION_TYPE_ENUM.BASIC}
            terms={TERMS_OF_BASIC_YEARLY}
          />
          <PricingCard
            tag="Pro"
            description="Perfect for individual designers or small teams looking to explore AI-powered tools for architecture."
            price="$700.00"
            type="year"
            subscriptionType={SUBSCRIPTION_TYPE_ENUM.PRO}
            terms={TERMS_OF_PRO_YEARLY}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default PricingTabsGroup;

