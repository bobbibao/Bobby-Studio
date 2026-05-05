import React, { useState } from 'react';
import PricingTabsGroup from '@/components/PricingTabsGroup';
import Card from '@/shared/card';

const PricingPlan: React.FC = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  return (
    <Card extra="!z-5 overflow-hidden bg-white !rounded-lg h-full my-4">
      <div className="flex flex-col items-center my-6">
        <h1 className="text-primary dark:text-white font-semibold text-[40px]">
          Choose your right plan!
        </h1>

        <span className="text-base text-[#6C757D]">
          Upgrade and unlock the power of AI architecture and interior design
        </span>

        <div className="flex flex-col min-h-screen h-full w-full min-w-[300px] rounded-lg bg-white dark:bg-gray-900 my-6">
          <div className="flex-grow w-full">
            <PricingTabsGroup
              selectedTabIndex={selectedTabIndex}
              setSelectedTabIndex={setSelectedTabIndex}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PricingPlan;



