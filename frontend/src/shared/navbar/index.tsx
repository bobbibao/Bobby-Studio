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
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { INSPIRATION_TABS } from '@/constants';
import { useTranslation } from 'react-i18next';
import HistoryMenu from './HistoryJobMenu';

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
      <Flex align="center" gap={2}>
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

      <HStack spacing={2} mr={2} position="relative" align="center" h="16">
        {shouldUseWorkspaceGhostButton ? (
          <Box
            as="button"
            type="button"
            onClick={handleGenerateClick}
            display="flex"
            alignItems="center"
            gap={2}
            rounded="lg"
            border="1px solid"
            borderColor={workspaceGhostBorder}
            bg="transparent"
            px={3}
            py={2}
            fontSize="sm"
            fontWeight="semibold"
            color={workspaceGhostText}
            h="10"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-1px)' }}
          >
            <Box color={workspaceGhostIcon}>
              <GenerateIcon />
            </Box>
            {translatorCommonNS('workspace')}
          </Box>
        ) : (
          <Button
            label={translatorCommonNS('workspace')}
            iconPosition="before"
            extraClass="!bg-black !text-white dark:!bg-white dark:!text-black !h-10 !px-3 !py-2 !text-sm !font-semibold transform transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md dark:hover:shadow-white/10 hover:!bg-black dark:hover:!bg-white hover:!text-white dark:hover:!text-black"
            onClick={handleGenerateClick}
            icon={<GenerateIcon />}
          />
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
        <IconButton
          aria-label="History"
          icon={<HistoryMenu />}
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
        />
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
    </Box>
  );
};

export default Navbar;

