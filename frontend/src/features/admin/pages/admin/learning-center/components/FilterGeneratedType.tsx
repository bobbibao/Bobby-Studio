import { GENERATION_MODELS } from '@/constants';
import { Box, Flex, Tab, TabList, Tabs } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import { removeEmpty } from '@/utils/index';
import ThemedSelect from '@/components/ThemedSelect';

const GENERATED_TYPE_TABS = [
  'All',
  GENERATION_MODELS.LINE_DRAWING_TO_IMAGE,
  GENERATION_MODELS.TEXT_TO_IMAGE,
  GENERATION_MODELS.SEASONAL_TRANSFORMATION,
];
const FilterGeneratedType = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);
  const [selectedOption, setSelectedOption] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam) {
      const tabIndex = GENERATED_TYPE_TABS.indexOf(typeParam);
      setSelectedTabIndex(tabIndex);
    } else {
      setSelectedTabIndex(0); // Default to 'ALL' tab if no 'type' param
    }
  }, []);

  const updateSearchParams = ({ date, type }: { date?: string; type?: string }) => {
    const queryUpdated = removeEmpty({
      date,
      type: type === 'All' ? undefined : type,
    });
    navigate(`?${queryString.stringify(queryUpdated)}`, { replace: true });
  };

  /**
   * Handle tab change to filter images
   * @param index
   */
  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    updateSearchParams({
      type: GENERATED_TYPE_TABS[index],
      date: selectedOption,
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(e.target.value);
    updateSearchParams({
      type: GENERATED_TYPE_TABS[selectedTabIndex],
      date: e.target.value,
    });
  };
  const dateOptions = [{ value: '12/09/2024', label: 'Dec 9, 2024' }];

  return (
    <Flex justifyContent={'space-between'} w={'full'}>
      <Tabs index={selectedTabIndex} onChange={handleTabChange} variant="unstyled">
        <div className="p-1 flex items-center bg-gray-50 border border-borderLight dark:bg-gray-900 dark:border-none rounded-lg h-12">
          <TabList className="flex items-center space-x-2">
            {GENERATED_TYPE_TABS.map((tab, index) => (
              <Tab
                key={index}
                className={`inline-flex rounded-lg py-2 px-3 text-center text-base font-normal dark:text-white ${
                  selectedTabIndex === index ? 'bg-primary text-white' : ''
                } transition-colors duration-300`}
              >
                {tab}
              </Tab>
            ))}
          </TabList>
        </div>
      </Tabs>
      <Box>
        <ThemedSelect
          placeholder="Date"
          options={dateOptions}
          value={dateOptions.find((opt: { value: string | undefined }) => opt.value === selectedOption)}
          onChange={(selectedOption: { value: any }) => handleSelectChange(selectedOption?.value || '')}
        />
      </Box>
    </Flex>
  );
};

export default FilterGeneratedType;



