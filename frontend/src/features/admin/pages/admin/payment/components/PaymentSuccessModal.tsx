'use client';

import { FC } from 'react';
import { Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from '@chakra-ui/react';
import success_ic from '@/assets/svg/icons/success.svg';
import { useTranslation } from 'react-i18next';

type PaymentSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};
export const PaymentSuccessModal: FC<PaymentSuccessModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  return (
    <>
      {/*<Button onClick={() => setIsOpen(true)} colorScheme="primary">*/}
      {/*</Button>*/}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent className="rounded-xl p-6 text-center">
          <ModalHeader p={0}>
            <img src={success_ic} alt={'success'} className="w-18 h-18 text-green-500 mx-auto" />
          </ModalHeader>
          <ModalBody p={0} mt={5}>
            <h2 className="text-xl font-semibold">{t('profile:payment_confirmation')}</h2>
            <p className="text-gray-500 mt-2">{t('profile:please_confirm_to_proceed_with_your_payment')}</p>
          </ModalBody>
          <ModalFooter p={0} mt={8}>
            <Button colorScheme="primary" w="full" onClick={onConfirm}>
              {t('common:ok')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};



