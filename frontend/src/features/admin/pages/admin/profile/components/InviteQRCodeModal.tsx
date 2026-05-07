"use client";

import { useEffect, useState } from 'react';
import {
  Button,
  Heading,
  Text,
  Stack,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  IconButton,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import CopyIcon from '@/shared/icons/CopyIcon';
import QRCode from "react-qr-code";
import * as teamAPI from '@/features/team';
import { useTranslation } from 'react-i18next';

const InviteQRCodeModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState<string|null>("");
  const toast = useToast();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchInviteLink();
  }, [isOpen]);

  const fetchInviteLink = async () => {
    const link = await teamAPI.generateInviteLink();
    setInviteLink(link);
  }

  const copyToClipboard = () => {
    if (typeof inviteLink === 'string') {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: t('notification:copied'),
        description: t('notification:invite_link_copied_to_clipboard'),
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent w="400px" overflow="hidden">
        <ModalHeader pb={2}>
          <Heading size="md" mb={3}>
          {translatorProfileNS('scan_to_join')}
          </Heading>
        </ModalHeader>

        <ModalBody textAlign="center" px={6} py={4}>
          <Stack align="center" spacing={4}>
            <Text fontSize="sm" color="gray.500" mb={4}>
            {translatorProfileNS('scan_the_qr_code_to_join_the_team')}
            </Text>

            <QRCode
              value={inviteLink??''}
              size={200}
              bgColor={useColorModeValue("white", "#0E0E0E")}
              fgColor={useColorModeValue("black", "white")}
            />

            <Flex w="full" align="center" gap={2}>
              <Input
                value={inviteLink??''}
                isReadOnly
                py={5}
                pl={5}
                borderColor="gray.400"
                flex={1}
                size="md"
              />
              <Button
                onClick={copyToClipboard}
                variant="ghost"
                height="auto"
                w="44px"
                colorScheme="primary"
              >
                <CopyIcon />
              </Button>
            </Flex>
          </Stack>
        </ModalBody>

        <ModalFooter px={6} py={4}>
          <Button
            w="full"
            fontSize="md"
            py={5}
            colorScheme="primary"
            onClick={onClose}
          >
            {translatorProfileNS('close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default InviteQRCodeModal;



