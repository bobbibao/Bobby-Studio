import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '@chakra-ui/react';
import { clearToast } from '@/slices/toastSlice';
import { useTranslation } from 'react-i18next';

const ToastNotification = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useDispatch();
  const toastState = useSelector((state: any) => state.toast);

  useEffect(() => {
    if (toastState) {
      toast({
        title: t(`notification:${toastState.status === 'error' ? 'error' : 'notification'}`),
        description: toastState.message,
        status: toastState.status,
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });

      dispatch(clearToast()); // Xóa toast sau khi hiển thị
    }
  }, [toastState, dispatch, toast]);

  return null;
};

export default ToastNotification;

