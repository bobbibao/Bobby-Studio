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

type ModalUserNotActiveProps = {
  open: boolean;
  onClose: () => void; 
};

export const ModalUserNotActive: FC<ModalUserNotActiveProps> = ({
  open,
  onClose
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
        labelSubmit={t('common:cancel')}
        onSubmit={handleUpgrade}
        loadingSubmit={loading}
        showCancel={false}
      >
        <p className="flex justify-center">
          <QuestionIconBgPurple />
        </p>
        <h1 className="text-txtPrimary dark:text-white mt-5 text-xl font-semibold text-center">
          {translatorProfileNS('contact_admin')}
        </h1>
        <p className="text-secondary mt-2 text-sm text-center whitespace-pre-line">
          {translatorProfileNS(
            'this_account_has_been_deleted_please_contact_admin_for_more_information'
          )}
          <div>Email: <span className='font-bold'> info@bobby.ai </span> </div>
        </p>
        {error && <p className="mt-2 text-center text-red-500">{error}</p>}
      </ModalCommon>
    </>
  );
};



