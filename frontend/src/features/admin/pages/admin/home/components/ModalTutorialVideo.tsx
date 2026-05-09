import { FC, useState } from 'react';
import { Button, IconButton, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import { ModalCommon } from '@/shared/modal';
import { QuestionIconBgPurple } from '@/shared/icons/QuestionIconPurple';
import { useNavigate } from 'react-router-dom';
import { updateSubscriptionPlan } from '@/features/user';
import success_ic from '@/assets/svg/icons/success.svg';
import { CloseIcon, WarningIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { EditIcon, Wand2 } from 'lucide-react';
type ModalTutorialVideoProps = {
  open: boolean;
  onClose: () => void
};

export const ModalTutorialVideo: FC<ModalTutorialVideoProps> = ({
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

    setLoading(true);
    try {
  
    } catch (err: any) {
    } finally {
      setLoading(false);
      onClose(); // Đóng modal xác nhận
    }
  };

  const handleResultOk = async () => {
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
        size="6xl"
        showFooter
        // classNameFooter="mt-8"
        labelSubmit={t('common:confirm')}
        onSubmit={handleUpgrade}
        loadingSubmit={loading}
        showCancel={false}
        showSubmit={false}
      >
        <div className='flex justify-between items-center mb-2.5'>
          <h1 className="text-txtPrimary dark:text-white text-xl font-semibold">
            {translatorProfileNS(
            'here_is_a_quick_tutorial_video_to_help_you_get_started'
          )}
          </h1>
          <IconButton aria-label="Close tutorial" variant="outline" size="sm" icon={<CloseIcon boxSize={4} />} onClick={onClose} />
        </div>

        <div className="w-full" style={{ maxHeight: '65vh', overflow: 'hidden' }}>
          <iframe
            className="w-full"
            style={{ height: '65vh', border: 0 }}
            src="https://www.youtube.com/embed/iUi8V6ZzPV8"
            title="Tutorial Video"
            frameBorder="0"
            allow="encrypted-media"
            allowFullScreen
          />
        </div>

        {error && <p className="mt-2 text-center text-red-500">{error}</p>}
      </ModalCommon>

      
    </>
  );
};



