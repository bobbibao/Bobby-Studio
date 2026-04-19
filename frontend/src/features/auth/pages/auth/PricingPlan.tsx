import React, { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import PricingCard from '@/components/PricingCard';
import { TERMS_OF_BASIC_MONTHLY, TERMS_OF_PRO_MONTHLY, TERMS_OF_BASIC_YEARLY, TERMS_OF_PRO_YEARLY } from '@/constants';
import { PRICING_PLAN_ENUM, SUBSCRIPTION_TYPE_ENUM } from '@/types';
import Card from '@/shared/card';

const PricingPlan: React.FC = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  return (
    <Card extra="!z-5 overflow-hidden bg-gray-900 h-full pt-0 shadow-0">
      <div className="flex flex-col items-center bg-gray-900">
        <h1 className="text-white text-start font-semibold text-[40px]">
          Choose your right plan!
        </h1>

        <span className="text-base text-[#6C757D]">
          Upgrade and unlock the power of AI architecture and interior design
        </span>

        <div className="flex flex-col min-h-screen h-full w-full min-w-[300px] bg-gray-900 dark:bg-gray-900 my-6">
          <div className="flex-grow w-full">
          <Tabs
      index={selectedTabIndex}
      onChange={setSelectedTabIndex}
      variant="unstyled"
    >
      <div className="rounded bg-gray-50 dark:bg-black max-w-[400px] m-auto">
        <TabList className="p-1">
          <Tab
            className={`flex-1 rounded-lg py-2 text-center text-[16px] font-normal text-white ${
              selectedTabIndex === 0 ? 'bg-primary text-white' : ''
            } transition-colors duration-300`}
          >
            {PRICING_PLAN_ENUM.MONTHLY}
          </Tab>
          <Tab
            className={`flex-1 rounded-lg py-2 text-center text-[16px] font-normal text-white ${
              selectedTabIndex === 1 ? 'bg-primary text-white' : ''
            } transition-colors duration-300`}
          >
            {PRICING_PLAN_ENUM.YEARLY}
          </Tab>
        </TabList>
      </div>

      <TabPanels className={`mt-20 flex justify-center`}>
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
            onClick={(value) => console.log(value)}
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
            onClick={(value) => console.log(value)}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PricingPlan;



