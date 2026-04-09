import React from 'react';
import routes from '@/routes';
import SidebarLinks from '@/shared/sidebar/components/Links';
import { motion } from 'framer-motion';
import { Box, Flex, IconButton, Image, useColorModeValue } from '@chakra-ui/react';
import logoImage from '@/assets/img/logo/header_white.png';
import iconImage from '@/assets/img/logo/icon_white_x.png';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onOpen }) => {
  const sidebarVariants = {
    open: {
      width: 200,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      width: 64,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const toggleButtonColor = useColorModeValue('zinc.600', 'white');
  const toggleButtonHoverColor = useColorModeValue('brand.600', 'brand.400');

  return (
    <Box
      as={motion.div}
      position="fixed"
      h="full"
      zIndex={50}
      display="flex"
      flexDirection="column"
      bg="transparent"
      initial={false}
      animate={open ? 'open' : 'closed'}
      variants={sidebarVariants}
    >
      <Flex
        position="relative"
        px={1}
        align="center"
        h="16"
        minH="16"
        justify={open ? 'flex-start' : 'center'}
        color="text.primary"
      >
        <Flex align="center" pl={open ? '18px' : 0} justify={open ? 'flex-start' : 'center'} w={open ? 'auto' : 'full'}>
          <Image
            src={open ? logoImage : iconImage}
            alt="Logo"
            h={open ? '16px' : '20px'}
            w="auto"
            objectFit="contain"
            mt="1px"
            filter={useColorModeValue('invert(1)', 'invert(0)')}
          />
        </Flex>
        <Box
          position="absolute"
          top="50%"
          transform="translateY(-50%)"
          right={open ? '16px' : '-12px'}
          zIndex={50}
          cursor="pointer"
          transition="all 0.3s"
          onClick={() => (open ? onClose?.() : onOpen?.())}
          role="group"
        >
          <IconButton
            aria-label={open ? 'Close sidebar' : 'Open sidebar'}
            icon={open ? <ChevronLeft size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            color={toggleButtonColor}
            opacity={0.75}
            _hover={{
              opacity: 1,
              transform: 'scale(1.1)',
              color: toggleButtonHoverColor,
            }}
            transition="all 0.2s"
          />
        </Box>
      </Flex>

      <Box as="ul" flexGrow={1} overflowY="auto" display="flex" flexDirection="column" py={2} px={4} h="full">
        <SidebarLinks isOpen={open} routes={routes.filter((el) => el?.name !== 'Edit')} />
      </Box>
    </Box>
  );
};

export default Sidebar;

