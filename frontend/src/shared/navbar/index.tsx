import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RootState } from '@/store';
import Button from '../buttons/Button';
import BellIcon from '../icons/BellIcon';
import ClockIcon from '../icons/ClockIcon';
import GenerateIcon from '../icons/GenerateIcon';
import MegaphoneIcon from '../icons/MegaphoneIcon';
import BackIcon from '../icons/BackIcon';
import CanvasIcon from '../icons/CanvasIcon';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Flex,
  HStack,
  Text,
  IconButton,
  Divider,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Menu as MenuIcon, Command, Cpu } from 'lucide-react';
import { INSPIRATION_TABS } from '@/constants';
import { useTranslation } from 'react-i18next';
import HistoryMenu from './HistoryJobMenu';
import ShortcutsModal from '@/components/common/ShortcutsModal';

interface NavbarProps {
  onOpenSidenav: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenSidenav }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navbarAllowBack = useSelector((state: RootState) => state.navbar.allowBack);
  const navbarHeading = useSelector((state: RootState) => state.navbar.heading);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  // Check if we're on the workspace page
  const tab = searchParams.get('tab');
  const mode = searchParams.get('mode');
  const submode = searchParams.get('submode');
  const isWorkspaceTab = tab === 'workspace' && (mode === 'generate' || mode === 'edit');
  const workspaceLinkedTabs = ['inspiration', 'projects', 'history'];
  const isLinkedGenerateTab = workspaceLinkedTabs.includes(tab ?? '') && mode === 'generate';
  const isEditMode = mode === 'edit';
  const isEditTab = tab === 'edit';
  const isVideoGenerateSubmode = mode === 'generate' && submode === 'video';
  const shouldUseWorkspaceGhostButton =
    isWorkspaceTab || isLinkedGenerateTab || isEditMode || isEditTab || isVideoGenerateSubmode;

  const [scrolled, setScrolled] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const translatorCommonNS = (key: string) => t(`common:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const translatorGenerateNS = (key: string) => t(`generate:${key}`);

  // Handle scroll event
  const handleScroll = () => {
    if (window.scrollY > 50) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const openNotifcation = () => {
    toast({
      title: translatorNotificationNS('notification_center'),
      description: translatorNotificationNS('there_is_no_new_notification_s'),
      status: 'success',
      duration: 9000,
      position: 'bottom-right',
      isClosable: true,
    });
  };

  // Function to navigate to the corresponding path
  const handleGenerateClick = () => {
    navigate(`/generate?tab=workspace`);
  };

  const handleCanvasClick = () => {
    navigate(`/generate?tab=canvas`);
  };

  const dividerColor = useColorModeValue('zinc.200', 'zinc.800');
  const iconButtonBg = useColorModeValue('white', 'zinc.800');
  const iconButtonBorder = useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.1)');
  const iconButtonHoverBg = useColorModeValue('gray.50', 'zinc.700');
  const iconButtonHoverBorder = useColorModeValue('zinc.300', 'zinc.600');
  const iconButtonActiveBg = useColorModeValue('gray.100', 'zinc.600');
  const workspaceGhostBorder = useColorModeValue('zinc.400', 'zinc.600');
  const workspaceGhostText = useColorModeValue('zinc.400', 'zinc.600');
  const workspaceGhostIcon = useColorModeValue('zinc.400', 'zinc.600');

  return (
    <Box
      as="nav"
      w="full"
      h="16"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      position="relative"
      zIndex={50}
      bg="transparent"
      px={4}
    >
      <Flex align="center" gap={2} minW={0}>
        {isMobile && (
          <IconButton
            aria-label="Open navigation"
            icon={<MenuIcon size={20} />}
            variant="ghost"
            h="11"
            w="11"
            minW="11"
            onClick={onOpenSidenav}
          />
        )}
        {navbarAllowBack && (
          <>
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Flex align="center" gap={2} fontSize="md" color="text.primary" cursor="pointer" onClick={handleBack}>
                <BackIcon />
                <Text as="span" lineHeight="none" color="text.primary">
                  {translatorCommonNS('back')}
                </Text>
              </Flex>
            </motion.div>
            <Box w="3px" h={5} rounded="md" bg={dividerColor} />
          </>
        )}
        <Box
          flexShrink={0}
          color="text.primary"
          display="flex"
          alignItems="center"
          fontSize="xl"
          lineHeight={5}
          textTransform="capitalize"
        >
          {navbarHeading ? (
            <Text
              as="span"
              display="block"
              ml={2}
              fontSize="lg"
              fontWeight="semibold"
              textTransform="capitalize"
              color="text.primary"
            >
              {navbarHeading}
            </Text>
          ) : (
            <Text
              as={Link}
              to="/"
              display="block"
              fontSize="lg"
              fontWeight="semibold"
              textTransform="capitalize"
              color="text.primary"
              _hover={{ color: 'text.primary' }}
            >
              Generation UI
            </Text>
          )}
        </Box>
      </Flex>

      <HStack spacing={2} mr={isMobile ? 0 : 2} position="relative" align="center" h="16">
        {/* Command Menu quick search bar in Navbar */}
        <Box
          as="button"
          type="button"
          display={{ base: 'none', md: 'flex' }}
          alignItems="center"
          gap={2}
          h="9"
          px={3}
          rounded="full"
          bg={useColorModeValue('rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)')}
          border="1px solid"
          borderColor={useColorModeValue('rgba(0,0,0,0.07)', 'rgba(255,255,255,0.08)')}
          color="text.muted"
          fontSize="xs"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          _hover={{
            bg: useColorModeValue('rgba(127,86,217,0.08)', 'rgba(139,92,246,0.12)'),
            borderColor: 'brand.400',
            color: 'text.primary',
          }}
          transition="all 0.2s"
        >
          <Text as="span">Search actions...</Text>
          <Box as="span" px={1.5} py={0.5} rounded="md" bg={useColorModeValue('white', 'zinc.800')} border="1px solid" borderColor="inherit" fontSize="10px" fontWeight="600">
            ⌘K
          </Box>
        </Box>

        {/* Live Engine Status indicator */}
        <Box
          display={{ base: 'none', lg: 'flex' }}
          alignItems="center"
          gap={1.5}
          px={2.5}
          py={1}
          rounded="full"
          bg={useColorModeValue('rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.12)')}
          border="1px solid"
          borderColor={useColorModeValue('rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.3)')}
          fontSize="2xs"
          fontWeight="semibold"
          color="emerald.400"
        >
          <Box w="6px" h="6px" rounded="full" bg="emerald.400" />
          <span>Core v2.0 • Online</span>
        </Box>

        {/* Keyboard Shortcuts Trigger */}
        <IconButton
          aria-label="Studio Shortcuts"
          icon={<Command size={15} />}
          size="sm"
          variant="ghost"
          rounded="full"
          display={{ base: 'none', sm: 'inline-flex' }}
          onClick={() => setIsShortcutsOpen(true)}
          color="text.muted"
          _hover={{ color: 'text.primary', bg: 'bg.subtle' }}
          title="Studio Pro Shortcuts (?)"
        />

        {isMobile ? (
          <IconButton
            aria-label={translatorCommonNS('workspace')}
            icon={<GenerateIcon />}
            h="10"
            w="10"
            minW="10"
            rounded="xl"
            bg="brand.600"
            color="white"
            boxShadow="0 4px 14px rgba(127, 86, 217, 0.4)"
            _hover={{ bg: 'brand.700', transform: 'scale(1.05)' }}
            onClick={handleGenerateClick}
          />
        ) : shouldUseWorkspaceGhostButton ? (
          <Box
            as="button"
            type="button"
            onClick={handleGenerateClick}
            display="flex"
            alignItems="center"
            gap={2}
            rounded="xl"
            border="1px solid"
            borderColor="brand.400"
            bg={useColorModeValue('rgba(127,86,217,0.08)', 'rgba(139,92,246,0.12)')}
            px={3.5}
            py={2}
            fontSize="sm"
            fontWeight="600"
            color="brand.500"
            h="10"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(127, 86, 217, 0.2)' }}
          >
            <Box color="brand.500">
              <GenerateIcon />
            </Box>
            {translatorCommonNS('workspace')}
          </Box>
        ) : (
          <Box
            as="button"
            type="button"
            onClick={handleGenerateClick}
            display="flex"
            alignItems="center"
            gap={2}
            rounded="xl"
            bg="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)"
            color="white"
            px={4}
            py={2}
            fontSize="sm"
            fontWeight="600"
            h="10"
            boxShadow="0 4px 14px rgba(127, 86, 217, 0.35)"
            transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px rgba(127, 86, 217, 0.5)',
              filter: 'brightness(1.08)',
            }}
            _active={{ transform: 'translateY(0)' }}
          >
            <GenerateIcon />
            {translatorCommonNS('workspace')}
          </Box>
        )}
        {/* <Box
          as="button"
          type="button"
          onClick={handleCanvasClick}
          display="flex"
          alignItems="center"
          gap={2}
          rounded="lg"
          border="1px solid"
          borderColor="text.primary"
          bg="transparent"
          px={3}
          py={2}
          fontSize="sm"
          fontWeight="semibold"
          color="text.primary"
          h="10"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-1px)' }}
        >
          <CanvasIcon />
          {translatorGenerateNS('canvas')}
        </Box> */}
        <Divider orientation="vertical" h={6} borderColor={dividerColor} />
        {/* History */}
        {/* The menu renders its own button; wrapping it in another button is invalid HTML. */}
        <Box
          h="10"
          w="10"
          rounded="lg"
          bg={iconButtonBg}
          border="1px solid"
          borderColor={iconButtonBorder}
          color="text.primary"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-1px)',
            bg: iconButtonHoverBg,
            borderColor: iconButtonHoverBorder,
          }}
          _active={{
            bg: iconButtonActiveBg,
          }}
        >
          <HistoryMenu />
        </Box>
        {/* Notifications */}
        <IconButton
          aria-label="Notifications"
          icon={<BellIcon />}
          variant="outline"
          size="md"
          h="10"
          w="10"
          minW="10"
          rounded="lg"
          bg={iconButtonBg}
          border="1px solid"
          borderColor={iconButtonBorder}
          color="text.primary"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-1px)',
            bg: iconButtonHoverBg,
            borderColor: iconButtonHoverBorder,
          }}
          _active={{
            bg: iconButtonActiveBg,
          }}
          onClick={() => openNotifcation()}
        />

        {/* {!isLogged ? (
          <Box
            cursor="pointer"
            rounded="lg"
            bg="bg.subtle"
            p={3}
            color="text.primary"
            onClick={() => navigate('/auth/sign-in')}
          >
            Sign in
          </Box>
        ) : (
          <UserProfileMenu
            userProfile={userProfile}
            handleSignout={handleSignout}
          />
        )} */}
      </HStack>
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </Box>
  );
};

export default Navbar;

