import { FC, useState } from 'react';
import { ModalCommon } from '@/shared/modal';
import { QuestionIconBgPurple } from '@/shared/icons/QuestionIconPurple';
import { cancelSubscription } from '@/features/user';
import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchCurrentUser } from '@/slices/currentUserSlice';

type ModalCancelSubscriptionProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const ModalCancelSubscription: FC<ModalCancelSubscriptionProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    try {
      setLoading(true);
      const result = await cancelSubscription();

      // Refresh user info/stats and subscription data right after cancel succeeds
      await dispatch(fetchCurrentUser());
      await onSuccess?.();

      toast({
        title: t('notification:subscription_canceled'),
        description:
          t('notification:your_plan_will_remain_active_until') +
          ' ' +
          new Date(result.current_period_end * 1000).toLocaleDateString(),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
      onSuccess?.();
    } catch (error) {
      toast({
        title: t('notification:cancel_failed'),
        description: t('notification:something_went_wrong_please_try_again_later'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalCommon
      isOpen={open}
      showClose={false}
      closeOnOverlayClick={false}
      onClose={onClose}
      size="md"
      showFooter
      classNameFooter="mt-8"
      labelSubmit={t('profile:confirm')}
      onSubmit={handleCancel}
      loadingSubmit={loading}
    >
      <p className="flex justify-center">
        <QuestionIconBgPurple />
      </p>
      <h1 className="text-txtPrimary dark:text-white mt-5 text-xl font-semibold text-center">
        {t('profile:cancel_subscription')}
      </h1>
      <p className="text-secondary mt-2 text-sm text-center">
        {t('profile:manage_your_current_plan_and_explore_alternative_options_before_proceeding_with_the_cancellation')}
      </p>
    </ModalCommon>
  );
};




