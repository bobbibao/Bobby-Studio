import { FC, useState } from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import { ModalCommon } from '@/shared/modal';
import { QuestionIconBgPurple } from '@/shared/icons/QuestionIconPurple';
import { useNavigate } from 'react-router-dom';
import { updateSubscriptionPlan } from '@/features/user';
import success_ic from '@/assets/svg/icons/success.svg';
import { WarningIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import { useAppDispatch } from '@/hooks/useAppDispatch';

type ModalCancelSubscriptionProps = {
  priceAmount?: number | undefined;
  priceId: string | undefined;
  open: boolean;
  onClose: () => void;
  plan?: 'monthly' | 'annually';
  onSuccess?: () => void;
};

export const ModalConfirmUpgradeSubscription: FC<ModalCancelSubscriptionProps> = ({
  priceAmount,
  priceId,
  open,
  onClose,
  plan = '',
  onSuccess,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    success: boolean;
    message: string;
  }>({ open: false, success: true, message: '' });
  const translatorProfileNS = (key: string) => t(`profile:${key}`);

  const handleUpgrade = async () => {
    if (!priceId) return;

    setLoading(true);
    try {
      const response = await updateSubscriptionPlan(priceId);
  
      setResultModal({
        open: true,
        success: true,
        message: 'subscription_upgraded_successfully',
      });
    } catch (err: any) {
      // Check if error indicates no active subscription
      const errorMessage = err?.response?.data?.message || err?.message || '';
      const isNoSubscriptionError = errorMessage.includes('No active subscription found');

      // Show failure modal
      setResultModal({
        open: true,
        success: false,
        message: isNoSubscriptionError
          ? 'no_active_subscription'
          : 'an_error_occurred_while_upgrading_the_subscription_please_try_again',
      });
    
    } finally {
      setLoading(false);
      await dispatch(fetchCurrentUser());
      onClose(); // Đóng modal xác nhận
    }
  };

  const handleResultOk = () => {
    const wasSuccessful = resultModal.success;
    setResultModal({ open: false, success: true, message: '' });
    // If upgrade was successful, trigger data refresh
    if (wasSuccessful && onSuccess) {
      onSuccess();
    }
    // Let the parent component handle the data refresh
    onClose();
  };

  return (
    <>
      <ModalCommon
        isOpen={open}
        showClose={false}
        closeOnOverlayClick={false}
        onClose={onClose}
        size="md"
        showFooter
        classNameFooter="mt-8"
        labelSubmit={t('common:confirm')}
        onSubmit={handleUpgrade}
        loadingSubmit={loading}
      >
        <p className="flex justify-center">
          <QuestionIconBgPurple />
        </p>
        <h1 className="text-txtPrimary dark:text-white mt-5 text-xl font-semibold text-center">
          {translatorProfileNS('upgrade_subscription')}
        </h1>
        <p className="text-secondary mt-2 text-sm text-center whitespace-pre-line">
          {translatorProfileNS(
            'are_you_sure_you_want_to_upgrade_your_subscription_your_current_subscription_will_be_canceled'
          )}

          <span className="font-bold"> CHF{priceAmount ? (priceAmount / 100).toFixed(0) : '0'}</span>
        </p>
        {error && <p className="mt-2 text-center text-red-500">{error}</p>}
      </ModalCommon>

      {/* Result modal (success or failure) */}
      <Modal size="lg" isOpen={resultModal.open} onClose={handleResultOk} isCentered>
        <ModalOverlay />
        <ModalContent className="rounded-xl p-6 text-center">
          <ModalHeader p={0}>
            {resultModal.success ? (
              <img src={success_ic} alt={'status-icon'} className="w-18 h-18 mx-auto text-green-500" />
            ) : (
              <WarningIcon w={10} h={10} color="red.500" />
            )}
          </ModalHeader>
          <ModalBody p={0} mt={5}>
            <h2 className="text-xl font-semibold">{translatorProfileNS('payment_status')}</h2>
            <p className="mt-2 text-gray-500">{translatorProfileNS(resultModal.message)}</p>
          </ModalBody>
          <ModalFooter p={0} mt={8}>
            <Button colorScheme="primary" w="full" onClick={handleResultOk}>
              {t('common:ok')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};




