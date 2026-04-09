import React, { ReactNode } from 'react';
import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import { classNames } from '@/utils';
import Button from '@/shared/buttons/Button';
import { useTranslation } from 'react-i18next';

interface ModalCommonProps {
  isOpen: boolean;
  title?: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  children: ReactNode;
  classNameContent?: string;
  classNameOverlay?: string;
  classNameHeader?: string;
  className?: string;
  classNameFooter?: string;
  closeOnOverlayClick?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  customOverlay?: any;
  showFooter?: boolean;
  disableSubmit?: boolean;
  loadingSubmit?: boolean; // 👈 thêm dòng này
  showClose?: boolean;
  labelCancel?: string;
  labelSubmit?: string;
  showCancel?:boolean;
  showSubmit?:boolean;
}

export const ModalCommon: React.FC<ModalCommonProps> = ({
  isOpen,
  title,
  onClose,
  onSubmit,
  children,
  classNameContent = '',
  classNameOverlay = '',
  classNameHeader = '',
  className = '',
  classNameFooter = '',
  closeOnOverlayClick = true,
  size = 'md',
  customOverlay,
  showFooter = false,
  disableSubmit = false,
  loadingSubmit = false, // 👈 default value
  showClose = true,
  labelCancel,
  labelSubmit,
  showCancel =true,
  showSubmit =true,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={closeOnOverlayClick}
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size={size}
    >
      <ModalOverlay className={classNameOverlay} bg="blackAlpha.300" backdropFilter="blur(10px)" {...customOverlay} />
      <ModalContent className={classNames('!rounded-xl !p-6', classNameContent)}>
        {title && (
          <ModalHeader className={classNames('flex items-center space-x-2 py-3 font-semibold text-xl', classNameHeader)}>
            {title}
          </ModalHeader>
        )}

        {showClose && <ModalCloseButton className="!top-2 !right-2" />}

        <ModalBody className={classNames('!p-0', className)}>{children}</ModalBody>

        {showFooter && (
          <ModalFooter className={classNames('!p-0 flex items-center space-x-4', classNameFooter)}>
            {showCancel&&(
            <Button
              label={labelCancel || t('common:cancel')}
              extraClass={`${showSubmit ? "w-[50%]" : "w-[100%]"} !bg-[transparent] !text-txtPrimary border border-borderPrimary dark:border-white dark:!text-white`}

              onClick={onClose}
            />
            )}

            {
              showSubmit&&(
                <Button
                  label={labelSubmit || t('common:submit')}
                  extraClass={`${showCancel ? "w-[50%]" : "w-[100%]"}`}
                  onClick={() => onSubmit?.()}
                  isDisabled={disableSubmit}
                  isLoading={loadingSubmit} 
                />
              )
            }
            
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

