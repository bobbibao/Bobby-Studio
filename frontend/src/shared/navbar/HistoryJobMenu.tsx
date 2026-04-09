import { Box, Button, Flex, Icon, List, ListItem, Menu, MenuButton, MenuGroup, MenuList, Portal, Text, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import ClockIcon from '../icons/ClockIcon';
import ImagePlaceholderIcon from '../icons/ImagePlacholderIcon';
import { useSelector } from 'react-redux';
import { selectHistoryJobs } from '@/reducers/inspiration';
import AddIcon from '../icons/AddIcon';
import { InputTypeEnum, InputTypeToTextMap } from '@/constants/attribute-enum';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { colors } from '@/theme/components/colors';

interface HistoryJobItem {
  jobId: string;
  type: string;
  progress: string;
  status: string;
}

const HistoryJobItem = ({ item }: { item: HistoryJobItem }) => {
  const iconBg = useColorModeValue('brand.600', 'brand.600');
  const iconColor = useColorModeValue('white', 'white');
  const progressBg = useColorModeValue('zinc.200', 'zinc.700');
  const progressBarBg = useColorModeValue('brand.600', 'brand.500');
  const itemHoverBg = useColorModeValue('zinc.50', 'zinc.900');

  return (
    <ListItem 
      display="flex" 
      justifyContent="space-between" 
      alignItems="center" 
      px={4} 
      py={3} 
      gap={4}
      _hover={{ bg: itemHoverBg }}
      transition="background 0.2s"
      cursor="default"
    >
      <Flex gap={3}>
        <Box
          width="28px"
          height="28px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
          p={2}
          bg={iconBg}
        >
          <ImagePlaceholderIcon width={'12px'} height={'12px'} color={iconColor} />
        </Box>
        <Flex direction="column" gap={1}>
          <Text color="text.primary" fontSize="sm" fontWeight="normal">
            {t(`generate:${InputTypeToTextMap.get(item.type as InputTypeEnum)}`)}
          </Text>
          <Flex alignItems="center" gap={2}>
            <Box w="48" h="2" bg={progressBg} borderRadius="full" overflow="hidden">
              <Box h="full" bg={progressBarBg} borderRadius="full" transition="width 0.3s" style={{ width: `${item.progress}%` }} />
            </Box>
            <Text color="text.muted" fontSize="xs" fontWeight="normal">
              {item.progress}%
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </ListItem>
  );
};

const HistoryJobMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigateToGenerate = (tab: string) => {
    navigate(`/generate?tab=${tab}`);
  };

  // Get history jobs from Redux store
  const historyJobs = useSelector(selectHistoryJobs);

  const historyJobItems = historyJobs
    .filter((job) => job.progress !== undefined && job.status !== 'completed')
    .map((job) => ({
      jobId: job.jobId,
      type: job.inputType,
      progress: job?.progress !== undefined ? job.progress.toString() : '0',
      status: job.status,
    }));
  const translatorCommonNS = (key: string) => t(`common:${key}`);

  // Chakra color values
  const menuBg = useColorModeValue('white', 'zinc.950');
  const menuBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const viewMoreButtonBg = useColorModeValue('zinc.100', 'zinc.800');
  const viewMoreButtonHoverBg = useColorModeValue('zinc.200', 'zinc.700');
  const emptyStateButtonBg = useColorModeValue('zinc.100', 'zinc.800');
  const emptyStateButtonHoverBg = useColorModeValue('zinc.200', 'zinc.700');
  const emptyStateIconColor = useColorModeValue(colors.zinc['900'], 'white');
  const listBorderColor = useColorModeValue('zinc.200', 'zinc.700');

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="unstyled"
        px={0}
        py={0}
        height="100%"
        width="100%"
        minW="unset"
        minH="unset"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="text.primary"
        _hover={{}}
        _active={{}}
      >
        <Box display="flex" alignItems="center" justifyContent="center">
          <ClockIcon />
        </Box>
      </MenuButton>

      <Portal>
        <MenuList
          maxW="300px"
          minW="300px"
          borderRadius="lg"
          bg={menuBg}
          borderColor={menuBorderColor}
          borderWidth="1px"
          boxShadow="xl"
          zIndex={99999}
          p={0}
        >
        <Box mb={2}>
          <Flex justify="space-between" align="center" px={4} py={3}>
            <Text fontSize="lg" fontWeight="semibold" color="text.primary">
              {translatorCommonNS('history')}
            </Text>
            <Button
              onClick={() => handleNavigateToGenerate('history')}
              variant="ghost"
              size="sm"
              fontWeight="medium"
              color="text.muted"
              bg={viewMoreButtonBg}
              px={2}
              py={1}
              borderRadius="md"
              _hover={{ 
                bg: viewMoreButtonHoverBg,
                color: 'text.primary'
              }}
            >
                {t('common:view_more')}
            </Button>
          </Flex>

          <MenuGroup title="" m={0} p={0}>
            <List spacing={0} borderTopWidth="1px" borderTopColor={listBorderColor}>
              <Flex direction="column">
                {historyJobItems.length > 0 ? (
                  historyJobItems.map((item) => <HistoryJobItem key={item.jobId} item={item} />)
                ) : (
                  <Flex direction="column" justify="center" align="center" p={6} gap={3}>
                    <Button
                      w="68px"
                      h="68px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      borderRadius="full"
                      bg={emptyStateButtonBg}
                      _hover={{ bg: emptyStateButtonHoverBg }}
                      onClick={() => handleNavigateToGenerate('workspace')}
                    >
                      <AddIcon
                        width="36px"
                        height="36px"
                        color={emptyStateIconColor}
                      />
                    </Button>
                    <Text color="text.muted" fontSize="sm" fontWeight="medium" textAlign="center">
                      {t('common:history_no_images_are_being_generated')}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </List>
          </MenuGroup>
        </Box>
      </MenuList>
      </Portal>
    </Menu>
  );
};

export default HistoryJobMenu;

