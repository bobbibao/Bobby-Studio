import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashIcon from '@/shared/icons/DashIcon';
import Switch from '@/shared/switch';
import { RouteConfig } from '@/types';
import { Tooltip, Box, Flex, Text, VStack, Divider, useColorModeValue, useColorMode, useToken } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthentication } from '@/hooks/useAuthentication';

interface SidebarLinksProps {
  isOpen: boolean;
  routes: RouteConfig[];
}

const SidebarLinks: React.FC<SidebarLinksProps> = ({ isOpen, routes }) => {
  const { t } = useTranslation();
  const { user } = useAuthentication();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { colorMode, toggleColorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const getRouteLabel = (route: RouteConfig) =>
    route.extraComponent === 'switch' ? 'Theme' : translatorCommonNS(route.name.toLocaleLowerCase().replace(/ /g, '_'));

  const isActiveRoute = (route: RouteConfig): boolean => {
    if (location.pathname === `/${route.path}`) {
      return true;
    }

    if (route.path === 'workspace') {
      return location.pathname === '/generate' && searchParams.get('tab') === 'workspace';
    }

    return false;
  };

  const filterRoutes = (position: 'top' | 'bottom'): RouteConfig[] =>
    routes.filter((route) => {
      // Show route if no position mismatch
      if (route.position !== position) return false;

      if (route.hideFromSidebar) return false;

      if (route.isDisabled) return false;

      // Hide admin-only routes from non-admin users
      if (route.adminOnly && !user?.isAdmin) return false;

      return true;
    });

  const handleToggleDarkMode = (): void => {
    toggleColorMode();
  };

  const renderExtraComponent = (extraComponent: string | undefined) => {
    if (extraComponent === 'switch') {
      return <Switch defaultChecked={isDarkMode} onChange={handleToggleDarkMode} />;
    }
    return null;
  };

  // Active state: Bright Skin = zinc.950 bg, zinc.50 icon | Dark Skin = zinc.50 bg, zinc.950 icon
  const activeBg = useColorModeValue('zinc.950', 'zinc.50');
  const activeTextColor = useColorModeValue('zinc.50', 'zinc.950');
  const inactiveTextColor = useColorModeValue('text.primary', 'text.primary');
  
  // Get actual color values from theme for reliable override
  const [zinc50, zinc950] = useToken('colors', ['zinc.50', 'zinc.950']);
  const activeIconColorValue = useColorModeValue(zinc50, zinc950); // zinc.50 in light, zinc.950 in dark
  const inactiveIconColorValue = useColorModeValue('#171717', '#FAFAFA'); // text.primary in light, white in dark

  // Used to keep icon backgrounds perfectly square when the sidebar is collapsed
  const collapsedItemSize = '36px';

  const renderLinkContent = (route: RouteConfig, isActive: boolean) => {
    const routeLabel = getRouteLabel(route);

    return (
      <Box
        as={motion.div}
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        position="relative"
        mb={3}
        cursor={route.isLinkDisabled && route.extraComponent !== 'switch' ? 'not-allowed' : 'pointer'}
        rounded="lg"
        bg={isActive ? activeBg : 'transparent'}
        onClick={() => route.extraComponent === 'switch' && handleToggleDarkMode()}
        w={isOpen ? 'full' : collapsedItemSize}
        minW={isOpen ? 'full' : collapsedItemSize}
        h={isOpen ? 'auto' : collapsedItemSize}
        minH={isOpen ? 'auto' : collapsedItemSize}
        mx={isOpen ? 0 : 'auto'}
        display={isOpen ? 'block' : 'flex'}
        alignItems="center"
        justifyContent="center"
      >
        <Box
          as="li"
          display="flex"
          alignItems="center"
          justifyContent={isOpen ? 'flex-start' : 'center'}
          my={isOpen ? '3px' : 0}
          px={isOpen ? 2 : 0}
          py={0}
          h={isOpen ? '10' : 'full'}
          minH={isOpen ? '10' : 'full'}
          w="full"
        >
          {isOpen ? (
            <Flex align="center" w="full" justify="space-between">
              <Flex align="center" flex={1}>
                <Box
                  pl={1}
                  color={isActive ? activeTextColor : inactiveTextColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w="20px"
                  h="20px"
                  flexShrink={0}
                  sx={{
                    '& svg path': {
                      fill: `${isActive ? activeIconColorValue : inactiveIconColorValue} !important`,
                    },
                  }}
                >
                  {route.icon ? <route.icon active={isActive} /> : <DashIcon />}
                </Box>

                <Text
                  ml={2}
                  fontSize="sm"
                  fontWeight="normal"
                  lineHeight="none"
                  color={isActive ? activeTextColor : inactiveTextColor}
                >
                  {routeLabel}
                </Text>
              </Flex>
              {route.extraComponent === 'switch' && (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  ml="auto"
                  flexShrink={0}
                >
                  {renderExtraComponent(route.extraComponent)}
                </Box>
              )}
            </Flex>
          ) : (
            <Flex
              align="center"
              justify="center"
              color={isActive ? activeTextColor : inactiveTextColor}
              w="full"
              h="full"
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="20px"
                h="20px"
                sx={{
                  '& svg path': {
                    fill: `${isActive ? activeIconColorValue : inactiveIconColorValue} !important`,
                  },
                }}
              >
                {route.icon ? <route.icon active={isActive} /> : <DashIcon />}
              </Box>
            </Flex>
          )}
        </Box>
      </Box>
    );
  };

  const renderLinks = (routesGroup: RouteConfig[]) =>
    routesGroup.map((route, index) => {
      const isActive = isActiveRoute(route);
      const linkContent = renderLinkContent(route, isActive);

      const routeLabel = getRouteLabel(route);
      const shouldShowTooltip = !isOpen;

      const interactiveElement =
        route.isLinkDisabled || route.extraComponent === 'switch' ? (
          linkContent
        ) : route.externalUrl ? (
          <Box
            as="a"
            href={route.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
          >
            {linkContent}
          </Box>
        ) : (
          <Box as={Link} to={`/${route.path}`} textDecoration="none" _hover={{ textDecoration: 'none' }}>
            {linkContent}
          </Box>
        );

      if (!shouldShowTooltip) {
        return <React.Fragment key={index}>{interactiveElement}</React.Fragment>;
      }

      const tooltipBg = useColorModeValue('zinc.950', 'white');
      const tooltipColor = useColorModeValue('white', 'zinc.900');
      const tooltipShadow = useColorModeValue('lg', 'xl');

      const shouldWrapTooltipChild = route.isLinkDisabled && route.extraComponent !== 'switch';

      return (
        <Tooltip
          key={index}
          label={routeLabel}
          placement="right"
          hasArrow
          borderRadius="md"
          bg={tooltipBg}
          color={tooltipColor}
          px={4}
          py={2}
          fontSize="sm"
          fontWeight="medium"
          boxShadow={tooltipShadow}
          openDelay={150}
          closeDelay={50}
          gutter={12}
          shouldWrapChildren={shouldWrapTooltipChild}
        >
          {interactiveElement}
        </Tooltip>
      );
    });

  const dividerColor = useColorModeValue('border.default', 'border.default');
  const groupLabelColor = useColorModeValue('text.muted', 'text.muted');

  const renderGroupedLinks = (position: 'top' | 'bottom') => {
    const groupedRoutes = filterRoutes(position).reduce<{
      [key: string]: RouteConfig[];
    }>((groups, route) => {
      const groupKey = route.group || '';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(route);
      return groups;
    }, {});

    return Object.entries(groupedRoutes).map(([groupName, groupRoutes], index) => (
      <Box key={index} mb={4}>
        {index !== 0 && (
          <Divider
            orientation="horizontal"
            borderColor={dividerColor}
            mb={2}
          />
        )}
        {groupName && isOpen && (
          <Text
            as="span"
            display="block"
            color={groupLabelColor}
            mb={2}
            fontSize="sm"
            fontWeight="semibold"
            textTransform="capitalize"
          >
            {t(`common:${groupName.toLowerCase()}`)}
          </Text>
        )}
        {renderLinks(groupRoutes)}
      </Box>
    ));
  };

  return (
    <VStack spacing={0} align="stretch" h="full" display="flex" flexDirection="column">
      <Box flexGrow={1}>{renderGroupedLinks('top')}</Box>
      <Box mt={12}>{renderGroupedLinks('bottom')}</Box>
    </VStack>
  );
};

export default SidebarLinks;

