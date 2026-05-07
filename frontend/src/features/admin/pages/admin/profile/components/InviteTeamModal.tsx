import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Text,
  Avatar,
  Box,
  Flex,
  Heading,
  useToast,
  FormControl,
  FormLabel,
  useClipboard,
  useColorModeValue,
} from '@chakra-ui/react';
import CopyIcon from '@/shared/icons/CopyIcon';
import * as teamAPI from '@/features/team';
import { useTranslation } from 'react-i18next';

const InviteTeamModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const toast = useToast();
  const [inviteLink, setInviteLink] = useState("");
  const { hasCopied, onCopy } = useClipboard(inviteLink);

  // Removed manual color mode values since they're handled by theme
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchInviteLink();
  }, [isOpen]);

  const handleCopy = () => {
    onCopy();
    toast({
      title: t('notification:copied'),
      description: t('notification:invite_link_copied_to_clipboard'),
      status: 'success',
      duration: 2000,
      position: 'bottom-right',
      isClosable: true,
    });
  };

  const fetchInviteLink = async () => {
    const link = await teamAPI.generateInviteLink();
    setInviteLink(link??"");
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent w="400px" overflow="hidden"> {/* Removed manual bg/border */}
        {/* Avatar Section */}
        <Box
          display="flex"
          justifyContent="center"
          position="relative"
          h="60px"
          mt={6}
        >
          <Avatar
            name="John Doe"
            src="https://i.pravatar.cc/150?img=1"
            size="md"
            position="absolute"
            bottom="0"
            left="50%"
            transform="translateX(-60px)"
            zIndex={1}
          />

          <Avatar
            name="Jane Smith"
            src="https://i.pravatar.cc/150?img=2"
            size="lg"
            position="absolute"
            top={'5px'}
            left="50%"
            transform="translateX(-50%) translateY(-5px)"
            zIndex={2}
            border="1px solid"
            borderColor={borderColor}
          />

          <Avatar
            name="Alice Brown"
            src="https://i.pravatar.cc/150?img=3"
            size="md"
            position="absolute"
            bottom="0"
            left="50%"
            transform="translateX(20px)"
            zIndex={1}
          />
        </Box>

        <ModalBody textAlign="center" px={6} py={4}>
          <Heading size="md" mb={3}>
            {translatorProfileNS('invite_your_team')}
          </Heading>
          <Text fontSize="sm" color="gray.500" mb={4}>
            {translatorProfileNS('to_invite_your_team_please_share_this_link_with_your_team_members')}
          </Text>

          <FormControl>
            <FormLabel fontSize="md" fontWeight="normal">
              {translatorProfileNS('share_link')}
            </FormLabel>
            <Flex gap={2}>
              <Input
                value={inviteLink}
                readOnly
                py={5}
                pl={5}
                borderColor="gray.400"
                flex={1}
                size="md"
              />
              <Button
                onClick={handleCopy}
                variant="ghost"
                height="auto"
                w="44px"
                colorScheme="primary"
              >
                <CopyIcon />
              </Button>
            </Flex>
          </FormControl>
        </ModalBody>

        <ModalFooter p={6}>
          <Flex w="full" gap={3}>
            <Button
              flex={1}
              className="rounded-lg dark:!bg-[transparent]"
              variant="outline"
              h={9}
              onClick={onClose}
            >
              {translatorProfileNS('cancel')}
            </Button>
            <Button
              flex={1}
              fontSize="md"
              py={5}
              h={9}
              colorScheme="primary"
            >
              {translatorProfileNS('get_started')}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteTeamModal;



