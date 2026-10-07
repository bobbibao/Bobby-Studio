import React from 'react';
import { useNavigate } from 'react-router-dom';
import routes from '@/routes';
import SidebarLinks from '@/shared/sidebar/components/Links';
import MorphIcon from '@/components/common/MorphIcon';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Flex,
  IconButton,
  Text,
  Tooltip,
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react';
import { LogoBobbyFull } from '@/shared/logo';
import BobbyLogoIcon from '@/shared/icons/BobbyLogoIcon';
import { ChevronLeft, ChevronRight, Moon, Sun, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  open: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  /** Overlay mode for narrow viewports: hidden until opened, with its own background. */
  mobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onOpen, mobile = false }) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';
  const isVietnamese = i18n.language?.toLowerCase().startsWith('vi');

  const sidebarVariants = {
    open: {
      width: mobile ? 280 : 256,
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 32,
      },
    },
    closed: {
      width: 72,
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 32,
      },
    },
  };

  const toggleButtonColor = useColorModeValue('zinc.600', 'zinc.400');
  const toggleButtonHoverColor = useColorModeValue('brand.600', 'brand.300');

  const desktopBg = useColorModeValue('rgba(255, 255, 255, 0.84)', 'rgba(11, 12, 19, 0.85)');
  const overlayBg = useColorModeValue('rgba(255, 255, 255, 0.96)', 'rgba(10, 11, 18, 0.96)');
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const floatingShadow = useColorModeValue(
    '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0,0,0,0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255,255,255,0.1)'
  );

  const activeLangBg = useColorModeValue('#FFFFFF', 'rgba(255, 255, 255, 0.12)');
  const activeLangColor = useColorModeValue('brand.600', 'brand.200');
  const inactiveLangColor = useColorModeValue('zinc.500', 'zinc.400');

  if (mobile && !open) return null;

  const handleLaunchStudio = () => {
    navigate('/generate?tab=workspace');
  };

  const handleToggleZen = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
  };

  return (
    <Box
      as={motion.aside}
      aria-label="Studio Command Deck"
      position="fixed"
      top={mobile ? 0 : '12px'}
      bottom={mobile ? 0 : '12px'}
      left={mobile ? 0 : '12px'}
      h={mobile ? '100dvh' : 'calc(100vh - 24px)'}
      zIndex={mobile ? 60 : 50}
      display="flex"
      flexDirection="column"
      bg={mobile ? overlayBg : desktopBg}
      backdropFilter="blur(26px)"
      sx={{ WebkitBackdropFilter: 'blur(26px)' }}
      borderRadius={mobile ? 'none' : '24px'}
      border={mobile ? 'none' : '1px solid'}
      borderRight={mobile ? '1px solid' : undefined}
      borderColor={borderColor}
      boxShadow={mobile ? '2xl' : floatingShadow}
      initial={false}
      animate={open ? 'open' : 'closed'}
      variants={sidebarVariants}
      overflow="hidden"
      className="gpu-accelerated studio-transition"
    >
      {/* 1. Header Deck: Logo & Collapse Trigger */}
      <Flex
        position="relative"
        align="center"
        justify={open ? 'space-between' : 'center'}
        h="16"
        minH="16"
        px={open ? 4 : 2}
        color="text.primary"
      >
        <Flex
          align="center"
          gap={2}
          cursor="pointer"
          onClick={() => navigate('/home')}
          title="Bobby Studio Home"
        >
          {open ? (
            <Flex align="center" gap={2}>
              <LogoBobbyFull />
              <Box
                w="6px"
                h="6px"
                rounded="full"
                bg="emerald.400"
                boxShadow="0 0 8px #10B981"
                title="Bobby Neural Core • Online"
              />
            </Flex>
          ) : (
            <Box role="img" aria-label="Bobby Studio" transform="scale(0.95)">
              <BobbyLogoIcon size={30} />
            </Box>
          )}
        </Flex>

        {/* Floating Collapse / Expand Trigger */}
        <IconButton
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          icon={open ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
          variant="ghost"
          size="xs"
          rounded="full"
          bg={useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.06)')}
          border="1px solid"
          borderColor={borderColor}
          boxShadow="xs"
          color={toggleButtonColor}
          _hover={{
            transform: 'scale(1.1)',
            color: toggleButtonHoverColor,
            bg: useColorModeValue('rgba(127, 86, 217, 0.1)', 'rgba(139, 92, 246, 0.15)'),
          }}
          transition="all 0.2s"
          onClick={() => (open ? onClose?.() : onOpen?.())}
        />
      </Flex>

      {/* 2. Primary Omni-Action: "New Creation" */}
      <Box px={open ? 3 : 2} mb={2}>
        {open ? (
          <Box
            as={motion.button}
            whileHover={{ scale: 1.02, translateY: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            w="full"
            h="42px"
            rounded="14px"
            bg="linear-gradient(135deg, #7F56D9 0%, #6366F1 50%, #EC4899 100%)"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
            boxShadow="0 4px 18px rgba(127, 86, 217, 0.35)"
            cursor="pointer"
            onClick={handleLaunchStudio}
            transition="box-shadow 0.2s"
            _hover={{
              boxShadow: '0 6px 22px rgba(127, 86, 217, 0.55)',
            }}
          >
            <Flex align="center" gap={2}>
              <MorphIcon type="sparkle" size={16} color="#FFFFFF" />
              <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em">
                {isVietnamese ? 'Tạo Tác Phẩm' : 'New Creation'}
              </Text>
            </Flex>
            <Box
              as="span"
              fontSize="9px"
              fontWeight="700"
              px={1.5}
              py={0.5}
              rounded="md"
              bg="whiteAlpha.250"
              backdropFilter="blur(4px)"
            >
              ⌘N
            </Box>
          </Box>
        ) : (
          <Tooltip
            label={isVietnamese ? 'Tạo Tác Phẩm (⌘N)' : 'New Creation (⌘N)'}
            placement="right"
            hasArrow
            borderRadius="xl"
            bg={useColorModeValue('zinc.900', 'zinc.800')}
            color="white"
            px={3}
            py={1.5}
            fontSize="xs"
            fontWeight="semibold"
            gutter={14}
          >
            <Box
              as={motion.button}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              w="42px"
              h="42px"
              mx="auto"
              rounded="xl"
              bg="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)"
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 4px 14px rgba(127, 86, 217, 0.4)"
              cursor="pointer"
              onClick={handleLaunchStudio}
            >
              <MorphIcon type="sparkle" size={18} color="#FFFFFF" />
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* 3. Navigation Links (Categorized Futuristic Matrix) */}
      <Box
        flexGrow={1}
        overflowY="auto"
        overflowX="hidden"
        display="flex"
        flexDirection="column"
        px={open ? 3 : 2}
        py={1}
        className="studio-scrollbar"
      >
        <SidebarLinks isOpen={open} routes={routes.filter((el) => el?.name !== 'Edit')} />
      </Box>

      {/* 4. Futuristic Bottom Studio Deck */}
      <Box
        p={open ? 3 : 2}
        borderTop="1px solid"
        borderColor={borderColor}
        bg={useColorModeValue('rgba(0,0,0,0.015)', 'rgba(255,255,255,0.015)')}
      >
        {/* Live Compute / Credits Widget */}
        {open ? (
          <Box
            p={2.5}
            mb={2.5}
            rounded="14px"
            bg={useColorModeValue('rgba(127, 86, 217, 0.05)', 'rgba(127, 86, 217, 0.08)')}
            border="1px solid"
            borderColor={useColorModeValue('rgba(127, 86, 217, 0.15)', 'rgba(139, 92, 246, 0.2)')}
          >
            <Flex align="center" justify="space-between" mb={1.5}>
              <Flex align="center" gap={1.5}>
                <Box w="5px" h="5px" rounded="full" bg="emerald.400" boxShadow="0 0 6px #10B981" />
                <Text
                  fontSize="2xs"
                  fontWeight="700"
                  color="text.muted"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Neural Engine
                </Text>
              </Flex>
              <Text fontSize="2xs" fontWeight="700" color="brand.400">
                1,250 CR
              </Text>
            </Flex>
            <Box w="full" h="3px" rounded="full" bg={useColorModeValue('gray.200', 'whiteAlpha.100')} overflow="hidden">
              <Box w="85%" h="full" rounded="full" bg="linear-gradient(90deg, #7F56D9 0%, #10B981 100%)" />
            </Box>
          </Box>
        ) : (
          <Tooltip
            label="Bobby Neural Core: 1,250 Credits Available"
            placement="right"
            hasArrow
            borderRadius="xl"
            bg={useColorModeValue('zinc.900', 'zinc.800')}
            color="white"
            px={3}
            py={1.5}
            fontSize="xs"
            gutter={14}
          >
            <Flex
              w="38px"
              h="38px"
              mx="auto"
              mb={2}
              rounded="xl"
              align="center"
              justify="center"
              bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(127, 86, 217, 0.12)')}
              border="1px solid"
              borderColor={useColorModeValue('rgba(127, 86, 217, 0.2)', 'rgba(139, 92, 246, 0.25)')}
              color="brand.400"
              cursor="pointer"
              onClick={() => navigate('/models')}
            >
              <Box w="6px" h="6px" rounded="full" bg="emerald.400" boxShadow="0 0 6px #10B981" />
            </Flex>
          </Tooltip>
        )}

        {/* 1-Click Language Switcher (ENG ⇄ VIE) [NO GERMAN] */}
        {open ? (
          <Flex
            align="center"
            justify="space-between"
            p={0.5}
            mb={2}
            borderRadius="10px"
            bg={useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.05)')}
            border="1px solid"
            borderColor={borderColor}
          >
            <Box
              as="button"
              type="button"
              flex={1}
              py={1}
              borderRadius="8px"
              fontSize="2xs"
              fontWeight={!isVietnamese ? '700' : '500'}
              color={!isVietnamese ? activeLangColor : inactiveLangColor}
              bg={!isVietnamese ? activeLangBg : 'transparent'}
              boxShadow={!isVietnamese ? 'xs' : 'none'}
              onClick={() => void i18n.changeLanguage('en')}
              transition="all 0.18s"
            >
              ENG
            </Box>
            <Box
              as="button"
              type="button"
              flex={1}
              py={1}
              borderRadius="8px"
              fontSize="2xs"
              fontWeight={isVietnamese ? '700' : '500'}
              color={isVietnamese ? activeLangColor : inactiveLangColor}
              bg={isVietnamese ? activeLangBg : 'transparent'}
              boxShadow={isVietnamese ? 'xs' : 'none'}
              onClick={() => void i18n.changeLanguage('vi')}
              transition="all 0.18s"
            >
              VIE
            </Box>
          </Flex>
        ) : (
          <Tooltip
            label={isVietnamese ? 'Chuyển sang English' : 'Switch to Tiếng Việt'}
            placement="right"
            hasArrow
            borderRadius="xl"
            bg={useColorModeValue('zinc.900', 'zinc.800')}
            color="white"
            px={3}
            py={1.5}
            fontSize="xs"
            gutter={14}
          >
            <Box
              as="button"
              type="button"
              w="38px"
              h="26px"
              mx="auto"
              mb={2}
              display="flex"
              alignItems="center"
              justifyContent="center"
              rounded="lg"
              bg={useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.05)')}
              border="1px solid"
              borderColor={borderColor}
              fontSize="2xs"
              fontWeight="700"
              color={activeLangColor}
              onClick={() => void i18n.changeLanguage(isVietnamese ? 'en' : 'vi')}
            >
              {isVietnamese ? 'VIE' : 'ENG'}
            </Box>
          </Tooltip>
        )}

        {/* Quick System Tools: Theme & Zen */}
        <Flex align="center" justify={open ? 'space-between' : 'center'} gap={1}>
          {open ? (
            <>
              <Flex
                as="button"
                type="button"
                onClick={toggleColorMode}
                align="center"
                gap={1.5}
                px={2}
                py={1}
                rounded="lg"
                color="text.muted"
                _hover={{ color: 'text.primary', bg: 'bg.subtle' }}
                fontSize="2xs"
                transition="all 0.2s"
              >
                {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
                <Text>{isDarkMode ? 'Light' : 'Dark'}</Text>
              </Flex>

              <Flex
                as="button"
                type="button"
                onClick={handleToggleZen}
                align="center"
                gap={1.5}
                px={2}
                py={1}
                rounded="lg"
                color="text.muted"
                _hover={{ color: 'text.primary', bg: 'bg.subtle' }}
                fontSize="2xs"
                transition="all 0.2s"
                title="Zen Mode (Z)"
              >
                <Maximize2 size={12} />
                <Text>Zen</Text>
              </Flex>
            </>
          ) : (
            <Tooltip
              label={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              placement="right"
              hasArrow
              borderRadius="xl"
              bg={useColorModeValue('zinc.900', 'zinc.800')}
              color="white"
              px={3}
              py={1.5}
              fontSize="xs"
              gutter={14}
            >
              <IconButton
                aria-label="Toggle color mode"
                icon={isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                variant="ghost"
                size="xs"
                rounded="lg"
                w="38px"
                h="30px"
                color="text.muted"
                _hover={{ color: 'text.primary', bg: 'bg.subtle' }}
                onClick={toggleColorMode}
              />
            </Tooltip>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default Sidebar;
