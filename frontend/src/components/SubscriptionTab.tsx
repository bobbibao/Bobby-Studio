import { Box, Tab, TabList, TabPanel, TabPanels, Tabs, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { TAB_TYPE_EDIT, TAB_TYPE_GENERATE } from '../constants';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@/utils';

const SUBSCRIPTION_TYPES = [TAB_TYPE_GENERATE, TAB_TYPE_EDIT] as SUBSCRIPTION_TYPE_ENUM[];

type SubscriptionProps = {
  children?: React.ReactNode[];
  onTabChange?: (value: SUBSCRIPTION_TYPE_ENUM) => void;
};

const SubscriptionTab: React.FC<SubscriptionProps> = ({ children, onTabChange }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  
  // Chakra color values - Using zinc colors
  const containerBg = useColorModeValue('white', 'zinc.950');
  const tabContainerBg = useColorModeValue('zinc.150', 'zinc.900');
  const tabContainerBorder = useColorModeValue('zinc.200', 'zinc.800');
  // Active tab: Light skin = zinc.950 bg, zinc.50 text | Dark skin = zinc.50 bg, zinc.950 text
  const activeTabBg = useColorModeValue('zinc.950', 'zinc.50');
  const activeTabText = useColorModeValue('zinc.50', 'zinc.950');
  const inactiveTabText = useColorModeValue('zinc.900', 'white');
  const inactiveTabHoverBg = useColorModeValue('zinc.300', 'zinc.800');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isBasic = params.get('isBasic');
    const mode = params.get('mode');

    // Check for mode=edit or isBasic=0 to switch to edit tab
    if ((mode && mode === 'edit') || (isBasic && Number(isBasic) === 0)) {
      handleTabChange(1, false); // Don't update URL when syncing from URL
    } else {
      handleTabChange(0, false); // Don't update URL when syncing from URL
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleTabChange = (index: number, updateURL: boolean = true) => {
    setSelectedTabIndex(index);
    onTabChange?.(SUBSCRIPTION_TYPES[index]);

    // Update URL with mode parameter when user clicks tabs
    if (updateURL) {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        const mode = index === 1 ? 'edit' : 'generate';
        newParams.set('mode', mode);
        return newParams;
      });
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="100%"
      w="100%"
      overflowY="auto"
      roundedLeft="lg"
      bg={containerBg}
      pt={3}
    >
      <Box w="100%" h="100%" position="relative">
        <Tabs index={selectedTabIndex} onChange={handleTabChange} variant="unstyled" h="100%" display="flex" flexDirection="column">
          <Box mb={4} px={4}>
            <Box
              bg={tabContainerBg}
              border="1px solid"
              borderColor={tabContainerBorder}
              borderRadius="md"
              display="flex"
              alignItems="center"
              gap={0}
              w="100%"
              p={0.5}
            >
              <TabList display="flex" gap={0} w="100%">
                {SUBSCRIPTION_TYPES.map((item, index) => (
                  <Tab
                    key={index}
                    flex={1}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    px={3}
                    py={2}
                    borderRadius="md"
                    cursor="pointer"
                    transition="all 0.2s"
                    fontSize="sm"
                    fontWeight="medium"
                    border="none"
                    outline="none"
                    boxSizing="border-box"
                    m={0}
                    minW={0}
                    bg={selectedTabIndex === index ? activeTabBg : 'transparent'}
                    color={selectedTabIndex === index ? activeTabText : inactiveTabText}
                    boxShadow={selectedTabIndex === index ? 'md' : 'none'}
                    _hover={selectedTabIndex === index ? {} : {
                      bg: inactiveTabHoverBg,
                      boxShadow: 'md',
                    }}
                    _selected={{ 
                      border: 'none', 
                      outline: 'none'
                    }}
                    _focus={{ 
                      border: 'none', 
                      outline: 'none', 
                      boxShadow: selectedTabIndex === index ? 'md' : 'none'
                    }}
                    _active={{ 
                      border: 'none', 
                      outline: 'none'
                    }}
                  >
                    {capitalize(t(`common:${item.toLowerCase()}`))}
                  </Tab>
                ))}
              </TabList>
            </Box>
          </Box>

          <TabPanels flex={1} minH={0}>
            {SUBSCRIPTION_TYPES.map((_, index) => (
              <TabPanel p={0} h="100%" key={index}>
                {children && children[index]}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default SubscriptionTab;

