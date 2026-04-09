import { Menu, MenuButton, MenuList, MenuGroup, Text, Flex, Button, useColorMode, MenuItem } from '@chakra-ui/react';
import ContentLoader from 'react-content-loader';
import DollarIcon from '../icons/DollarIcon';
import { useVizPoints } from '@/hooks/rq/useVizPoints';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';

type VizPointItemProps = {
  type: 'free' | 'subscription';
  label: string;
  description: string;
};

const VizPointItem: React.FC<VizPointItemProps> = ({ type, label, description }) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const fillColor =
    type === 'free'
      ? isDark
        ? '#FFFFFF'
        : '#212529'
      : isDark
        ? '#A26EF4'
        : '#4F1D9B';

  const backgroundColor =
    type === 'free'
      ? isDark
        ? '#343A40'
        : '#E9ECEF'
      : isDark
        ? '#1C0B3F'
        : '#F3E8FF';

  return (
    <MenuItem
      borderRadius="6px"
      px={3}
      py={2}
      _dark={{
        bg: 'transparent',
        _hover: { bg: '#1A1A1A' },
      }}
    >
      <Flex direction="column" gap={1} width="100%">
        <Flex align="center" gap={2}>
          <DollarIcon fill={fillColor} background={backgroundColor} />
          <Text fontWeight="semibold" color={isDark ? '#E4E4E7' : 'gray.900'}>
            {label}
          </Text>
        </Flex>
        <Text color={isDark ? '#A1A1AA' : 'gray.600'} fontSize="sm">
          {description}
        </Text>
      </Flex>
    </MenuItem>
  );
};

const PointsMenu = () => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const { data: vizPoints, isLoading, refetch } = useVizPoints(true);

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  return (
    <Menu onOpen={refetch}>
      <MenuButton
        as={Button}
        variant="unstyled"
        display="flex"
        flexDirection="row"
        gap={1}
        borderRadius="lg"
        borderWidth="1px"
        px={3}
        py={2}
        height="40px"
        minWidth="72px"
        borderColor={colorMode === 'light' ? '#111113' : '#5E5E5E'}
        color={colorMode === 'light' ? '#111113' : '#E5E5E5'}
        bg="transparent"
        opacity={0.75}
        _hover={{ opacity: 0.6 }}
        _active={{ opacity: 0.5 }}
        leftIcon={<DollarIcon />}
      >
        <Text fontSize="14px">{(vizPoints?.freeVizPoints || 0) + (vizPoints?.subscriptionVizPoints || 0)}</Text>
      </MenuButton>

      <MenuList
        minWidth="311px"
        borderRadius="8px"
        p={2}
        bg={colorMode === 'dark' ? '#0F0F0F' : 'white'}
        borderColor={colorMode === 'dark' ? '#2E2E2E' : '#E4E4E7'}
        boxShadow="xl"
      >
        <MenuGroup
          title={translatorCommonNS('available_viz_points')}
          mb={2}
          color={colorMode === 'dark' ? '#F4F4F5' : 'gray.800'}
          fontSize="md"
        >
          {isLoading ? (
            <ContentLoader height={60} width={280} speed={2} backgroundColor="#f3f3f3" foregroundColor="#ecebeb">
              <rect x="10" y="10" rx="5" ry="5" width="260" height="20" />
              <rect x="10" y="40" rx="5" ry="5" width="200" height="15" />
            </ContentLoader>
          ) : (
            <>
              <VizPointItem
                type="free"
                label={`${translatorCommonNS('free_viz_points')}: ${vizPoints?.freeVizPoints || 0}`}
                description={translatorCommonNS('free_viz_points_for_testing')}
              />
              <VizPointItem
                type="subscription"
                label={`${translatorCommonNS('subscription_viz_points')}: ${vizPoints?.subscriptionVizPoints || 0}`}
                description={translatorCommonNS('points_from_your_pro_subscription')}
              />
              <Button
                variant={'solid'}
                width="100%"
                mt={2}
                color="white"
                className="dark:!bg-gray-700 !bg-gray-200 !text-txtPrimary dark:!text-white !border-gray-300 !font-semibold text-base hover:!opacity-80 "
                onClick={() => window.open('profile#subscription', '_blank')}
              >
                {translatorCommonNS('manage_subscription')}
                <ArrowUpRight className="ml-2" size={24} />
              </Button>
            </>
          )}
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

export default PointsMenu;

