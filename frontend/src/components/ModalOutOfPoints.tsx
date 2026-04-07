import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  VStack,
  useColorMode,
  Flex,
  Box,
  Button,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DollarIcon from '@/shared/icons/DollarIcon';

interface ModalOutOfPointsProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints?: number;
}

const ModalOutOfPoints: React.FC<ModalOutOfPointsProps> = ({ isOpen, onClose, currentPoints = 0 }) => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const navigate = useNavigate();

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const handleBuyMoreCredits = () => {
    onClose();
    navigate('/profile#subscription');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={colorMode === 'dark' ? '#1A1A1A' : 'white'} borderRadius="16px" boxShadow="2xl" maxW="480px">
        <ModalCloseButton />
        <ModalHeader pt={6}>
          <Flex align="center" justify="center" direction="column" gap={4}>
            <Box bg={colorMode === 'dark' ? '#2D2D2D' : '#F7F7F7'} p={4} borderRadius="full">
              <DollarIcon />
            </Box>
            <Text fontSize="24px" fontWeight="bold" textAlign="center" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
              {translatorCommonNS('out_of_points_title')}
            </Text>
          </Flex>
        </ModalHeader>

        <ModalBody pb={4}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="16px" textAlign="center" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'} lineHeight="1.6">
              {translatorCommonNS('out_of_points_message')}
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter flexDirection="column" gap={3} pb={6}>
          <Button
            onClick={handleBuyMoreCredits}
            width="100%"
            colorScheme="purple"
            size="lg"
            fontSize="16px"
            height="48px"
            borderRadius="10px"
          >
            {translatorCommonNS('buy_more_credits')}
          </Button>
          <Button
            onClick={onClose}
            width="100%"
            variant="ghost"
            size="lg"
            fontSize="16px"
            height="48px"
            borderRadius="10px"
            _dark={{ bg: '#1a1a1a' }}
            color={colorMode === 'dark' ? 'white' : 'gray.600'}
            _hover={{
              bg: colorMode === 'dark' ? '#2D2D2D' : 'gray.100',
            }}
          >
            {translatorCommonNS('maybe_later')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalOutOfPoints;

