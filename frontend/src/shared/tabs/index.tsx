import { FC, ReactNode } from 'react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { classNames } from '@/utils';

type TabsList = {
  name: string;
  component?: ReactNode;
};

type TabsCommonProps = {
  selected: number;
  onSelect: React.Dispatch<React.SetStateAction<number>>;
  tabs: TabsList[];
  className?: string;
  classNamePanels?: string;
  tabOnly?: boolean;
};

export const TabsCommon: FC<TabsCommonProps> = ({ selected, onSelect, tabs = [], className = '', classNamePanels = '', tabOnly = false }) => {
  return (
    <Tabs index={selected} onChange={onSelect} className={className}>
      <TabList className="p-1 w-fit space-x-1 rounded-[10px] bg-gray-50 border !border-b-[1px] border-borderLight dark:bg-gray-900 dark:!border-none max-h-12">
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            className={classNames(
              'rounded-md !mb-0 py-2 px-5 max-h-10 text-center text-base font-normal text-txtPrimary dark:text-white transition-colors duration-300 !border-none',
              selected === index ? '!bg-primary !text-white' : ''
            )}
          >
            {tab.name}
          </Tab>
        ))}
      </TabList>

      {!tabOnly && (
        <TabPanels className={classNames('mt-4', classNamePanels)}>
          {tabs.map((tab, index) => (
            <TabPanel key={index} padding={0}>
              {tab.component}
            </TabPanel>
          ))}
        </TabPanels>
      )}

      {tabOnly && (
        <TabPanels className={classNames('mt-0', classNamePanels)}>
          {tabs.map((tab, index) => (
            <TabPanel key={index} padding={0}>
              {tab.component}
            </TabPanel>
          ))}
        </TabPanels>
      )}
    </Tabs>
  );
};

