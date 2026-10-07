import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DashIcon from '@/shared/icons/DashIcon';
import Switch from '@/shared/switch';
import { RouteConfig } from '@/types';
import {
  Tooltip,
  Box,
  Flex,
  Text,
  VStack,
  useColorModeValue,
  useColorMode,
  Kbd,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthentication } from '@/hooks/useAuthentication';
import { Search } from 'lucide-react';

interface SidebarLinksProps {
  isOpen: boolean;
  routes: RouteConfig[];
}

interface NavCategory {
  id: string;
  labelEn: string;
  labelVi: string;
  routePaths: string[];
}

const CATEGORIES: NavCategory[] = [
  {
    id: 'core',
    labelEn: 'Creative Core',
    labelVi: 'Bộ Lõi Sáng Tạo',
    routePaths: ['workspace', 'models', 'prompts', 'lab'],
  },
  {
    id: 'vault',
    labelEn: 'Vault & Discovery',
    labelVi: 'Kho Lưu & Cảm Hứng',
    routePaths: ['', 'inspiration', 'projects', 'favorite'],
  },
  {
    id: 'system',
    labelEn: 'System & Admin',
    labelVi: 'Hệ Thống Quản Trị',
    routePaths: ['user-management', 'profile'],
  },
];

const ROUTE_BADGES: Record<string, { text: string; bg: string; color: string; border: string }> = {
  models: {
    text: 'v2.2',
    bg: 'rgba(127, 86, 217, 0.15)',
    color: '#A855F7',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  prompts: {
    text: 'PRO',
    bg: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    border: 'rgba(56, 189, 248, 0.3)',
  },
  lab: {
    text: 'LAB',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    border: 'rgba(16, 185, 129, 0.3)',
  },
};

const ROUTE_HOTKEYS: Record<string, string> = {
  workspace: 'W',
  models: 'M',
  prompts: 'P',
  lab: 'L',
  '': 'H',
  inspiration: 'I',
};

const SidebarLinks: React.FC<SidebarLinksProps> = ({ isOpen, routes }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthentication();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const { colorMode, toggleColorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';
  const isVietnamese = i18n.language?.toLowerCase().startsWith('vi');

  const getRouteLabel = (route: RouteConfig) => {
    if (route.extraComponent === 'switch') return isVietnamese ? 'Giao Diện' : 'Theme';
    if (route.name === 'AI Models') return isVietnamese ? 'Mô Hình AI' : 'AI Models';
    if (route.name === 'Prompt Matrix') return isVietnamese ? 'Thư Viện Prompt' : 'Prompt Matrix';
    if (route.name === 'Creative Lab') return isVietnamese ? 'Phòng Lab Tham Số' : 'Creative Lab';
    if (route.name === 'Workspace') return isVietnamese ? 'Bàn Sáng Tạo' : 'Canvas Studio';
    if (route.name === 'Home') return isVietnamese ? 'Trang Chủ' : 'Studio Home';
    if (route.name === 'Inspiration') return isVietnamese ? 'Cộng Đồng' : 'Inspiration';
    if (route.name === 'Projects') return isVietnamese ? 'Dự Án' : 'Projects';
    if (route.name === 'Favorite') return isVietnamese ? 'Đã Lưu' : 'Favorites';
    if (route.name === 'Profile') return isVietnamese ? 'Hồ Sơ' : 'Profile';
    if (route.name === 'Support') return isVietnamese ? 'Hỗ Trợ' : 'Support';
    if (route.name === 'User Management') return isVietnamese ? 'Quản Lý User' : 'User Management';

    const key = route.name.toLocaleLowerCase().replace(/ /g, '_');
    return t(`common:${key}`, { defaultValue: route.name });
  };

  const isActiveRoute = (route: RouteConfig): boolean => {
    const cur = location.pathname;
    const cleanCur = cur.replace(/^\/bobby/, '');

    if (route.path === 'workspace') {
      return (cur === '/generate' || cleanCur === '/generate') && searchParams.get('tab') === 'workspace';
    }

    if (route.path === '') {
      return cur === '/' || cur === '/home' || cur === '/bobby/home' || cleanCur === '' || cleanCur === '/home';
    }

    if (cur === `/${route.path}` || cleanCur === `/${route.path}` || cur === `/bobby/${route.path}`) {
      return true;
    }

    return false;
  };

  const handleOpenCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  // Futuristic styling tokens
  const tooltipBg = useColorModeValue('zinc.900', 'zinc.800');
  const tooltipColor = useColorModeValue('white', 'zinc.100');
  const activeBg = useColorModeValue('rgba(127, 86, 217, 0.12)', 'rgba(139, 92, 246, 0.2)');
  const activeBorderColor = useColorModeValue('rgba(127, 86, 217, 0.35)', 'rgba(168, 85, 247, 0.45)');
  const activeTextColor = useColorModeValue('brand.700', 'brand.200');
  const inactiveTextColor = useColorModeValue('text.primary', 'zinc.300');
  const activeIconColorValue = useColorModeValue('#7F56D9', '#C4B5FD');
  const inactiveIconColorValue = useColorModeValue('#6B7280', '#9CA3AF');
  const categoryHeaderColor = useColorModeValue('zinc.400', 'zinc.500');

  const searchBg = useColorModeValue('rgba(0, 0, 0, 0.03)', 'rgba(255, 255, 255, 0.04)');
  const searchBorder = useColorModeValue('rgba(0, 0, 0, 0.07)', 'rgba(255, 255, 255, 0.07)');

  const collapsedItemSize = '42px';

  // Filter accessible routes
  const availableRoutes = routes.filter((route) => {
    if (route.hideFromSidebar) return false;
    if (route.isDisabled) return false;
    if (route.adminOnly && !user?.isAdmin) return false;
    return true;
  });

  const renderRouteItem = (route: RouteConfig) => {
    const isActive = isActiveRoute(route);
    const routeLabel = getRouteLabel(route);
    const badge = ROUTE_BADGES[route.path];
    const hotkey = ROUTE_HOTKEYS[route.path];

    const linkInner = (
      <Box
        as={motion.div}
        whileHover={{ x: isOpen ? 2 : 0, scale: isOpen ? 1 : 1.05 }}
        whileTap={{ scale: 0.97 }}
        position="relative"
        mb={1.5}
        cursor={route.isLinkDisabled && route.extraComponent !== 'switch' ? 'not-allowed' : 'pointer'}
        rounded="xl"
        w={isOpen ? 'full' : collapsedItemSize}
        minW={isOpen ? 'full' : collapsedItemSize}
        h={isOpen ? '40px' : collapsedItemSize}
        minH={isOpen ? '40px' : collapsedItemSize}
        mx={isOpen ? 0 : 'auto'}
        display="flex"
        alignItems="center"
        justifyContent={isOpen ? 'flex-start' : 'center'}
        px={isOpen ? 3 : 0}
        color={isActive ? activeTextColor : inactiveTextColor}
        transition="all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
        _hover={{
          color: isActive ? activeTextColor : useColorModeValue('brand.600', 'white'),
        }}
        overflow="hidden"
      >
        {/* Sliding active glow pill indicator */}
        {isActive && (
          <motion.div
            layoutId="activeSidebarIndicator"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              backgroundColor: activeBg,
              border: `1px solid ${activeBorderColor}`,
              boxShadow: isDarkMode ? '0 2px 14px rgba(139, 92, 246, 0.25)' : '0 2px 12px rgba(127, 86, 217, 0.15)',
              zIndex: 0,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}

        {/* Hover backdrop when not active */}
        {!isActive && (
          <Box
            position="absolute"
            inset={0}
            borderRadius="xl"
            bg="transparent"
            transition="all 0.15s"
            _hover={{
              bg: useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.05)'),
            }}
            zIndex={0}
          />
        )}

        <Flex
          position="relative"
          zIndex={1}
          align="center"
          justify={isOpen ? 'space-between' : 'center'}
          w="full"
          h="full"
        >
          <Flex align="center" gap={2.5} minW={0}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="20px"
              h="20px"
              flexShrink={0}
              sx={{
                '& svg[fill]:not([fill="none"]) path': {
                  fill: `${isActive ? activeIconColorValue : inactiveIconColorValue} !important`,
                },
                '& svg path[fill]:not([fill="none"])': {
                  fill: `${isActive ? activeIconColorValue : inactiveIconColorValue} !important`,
                },
                '& svg[stroke]': {
                  stroke: `${isActive ? activeIconColorValue : inactiveIconColorValue} !important`,
                },
              }}
            >
              {route.icon ? <route.icon active={isActive} /> : <DashIcon />}
            </Box>

            {isOpen && (
              <Text
                fontSize="xs"
                fontWeight={isActive ? '600' : '500'}
                letterSpacing="0.01em"
                noOfLines={1}
                lineHeight="none"
              >
                {routeLabel}
              </Text>
            )}
          </Flex>

          {/* Right badges & hotkeys */}
          {isOpen && (
            <Flex align="center" gap={1.5} flexShrink={0}>
              {badge && (
                <Box
                  as="span"
                  fontSize="9px"
                  fontWeight="700"
                  letterSpacing="0.05em"
                  px={1.5}
                  py={0.5}
                  rounded="md"
                  bg={badge.bg}
                  color={badge.color}
                  border="1px solid"
                  borderColor={badge.border}
                  lineHeight="none"
                >
                  {badge.text}
                </Box>
              )}
              {hotkey && !badge && (
                <Kbd
                  fontSize="9px"
                  py={0.5}
                  px={1.5}
                  rounded="md"
                  bg={useColorModeValue('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)')}
                  color="text.muted"
                  borderColor="transparent"
                  display={{ base: 'none', lg: 'inline-flex' }}
                >
                  {hotkey}
                </Kbd>
              )}
            </Flex>
          )}
        </Flex>
      </Box>
    );

    const interactiveElement = route.externalUrl ? (
      <Box
        as="a"
        href={route.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        textDecoration="none"
        w="full"
        _hover={{ textDecoration: 'none' }}
      >
        {linkInner}
      </Box>
    ) : (
      <Box
        as={Link}
        to={`/${route.path}`}
        textDecoration="none"
        w="full"
        _hover={{ textDecoration: 'none' }}
      >
        {linkInner}
      </Box>
    );

    if (isOpen) {
      return <React.Fragment key={route.path || route.name}>{interactiveElement}</React.Fragment>;
    }

    return (
      <Tooltip
        key={route.path || route.name}
        label={`${routeLabel}${hotkey ? ` (${hotkey})` : ''}`}
        placement="right"
        hasArrow
        borderRadius="xl"
        bg={tooltipBg}
        color={tooltipColor}
        px={3}
        py={1.5}
        fontSize="xs"
        fontWeight="semibold"
        boxShadow="xl"
        openDelay={100}
        gutter={14}
      >
        {interactiveElement}
      </Tooltip>
    );
  };

  return (
    <VStack spacing={0} align="stretch" h="full" display="flex" flexDirection="column" userSelect="none">
      {/* Quick Search Trigger (⌘K) */}
      <Box mb={3} px={isOpen ? 0 : 0}>
        <Tooltip
          label={isVietnamese ? 'Mở thanh lệnh (Ctrl+K)' : 'Search commands (Ctrl+K)'}
          placement="right"
          isDisabled={isOpen}
          hasArrow
          borderRadius="xl"
          bg={tooltipBg}
          color={tooltipColor}
          px={3}
          py={1.5}
          fontSize="xs"
          gutter={14}
        >
          <Box
            as="button"
            type="button"
            onClick={handleOpenCommandPalette}
            display="flex"
            alignItems="center"
            justifyContent={isOpen ? 'space-between' : 'center'}
            w={isOpen ? 'full' : collapsedItemSize}
            h="38px"
            px={isOpen ? 3 : 0}
            mx={isOpen ? 0 : 'auto'}
            rounded="xl"
            bg={searchBg}
            border="1px solid"
            borderColor={searchBorder}
            color="text.muted"
            _hover={{
              bg: useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.12)'),
              borderColor: activeBorderColor,
              color: 'text.primary',
            }}
            transition="all 0.2s"
          >
            <Flex align="center" gap={2}>
              <Search size={15} />
              {isOpen && (
                <Text fontSize="xs" fontWeight="500">
                  {isVietnamese ? 'Tìm lệnh nhanh...' : 'Quick Command...'}
                </Text>
              )}
            </Flex>
            {isOpen && (
              <Kbd
                fontSize="10px"
                py={0.5}
                px={1.5}
                rounded="md"
                bg={useColorModeValue('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)')}
                color="text.muted"
                borderColor="transparent"
              >
                ⌘K
              </Kbd>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Categorized Revolutionary Navigation */}
      <Box flexGrow={1} overflowY="auto" overflowX="hidden" pr={isOpen ? 1 : 0} className="studio-scrollbar">
        {CATEGORIES.map((cat) => {
          const catRoutes = availableRoutes.filter((r) => cat.routePaths.includes(r.path));
          if (catRoutes.length === 0) return null;

          return (
            <Box key={cat.id} mb={3.5}>
              {isOpen ? (
                <Flex align="center" justify="space-between" px={1.5} mb={1.5}>
                  <Text
                    fontSize="10px"
                    fontWeight="700"
                    color={categoryHeaderColor}
                    letterSpacing="0.08em"
                    textTransform="uppercase"
                  >
                    {isVietnamese ? cat.labelVi : cat.labelEn}
                  </Text>
                </Flex>
              ) : (
                <Box
                  w="20px"
                  h="1px"
                  bg={useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')}
                  mx="auto"
                  my={2}
                />
              )}

              {catRoutes.map(renderRouteItem)}
            </Box>
          );
        })}
      </Box>
    </VStack>
  );
};

export default SidebarLinks;
