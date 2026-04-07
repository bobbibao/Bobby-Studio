import React, { useCallback, useEffect, useState, useRef } from 'react';
import ToolWrapper from './ToolWrapper';
import img_placeholder from '../assets/svg/image-placholder.svg';
import { Modal, ModalOverlay, ModalContent, Image, useDisclosure, Input } from '@chakra-ui/react';
import CloseIcon from '../shared/icons/CloseIcon';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';
import { fileUpload } from '@/utils/index';
import { useTranslation } from 'react-i18next';

interface UploadImageProps {
  position?: number;
  name: string;
  accept?: string;
  titleWrapper?: string;
  title?: string;
  titleSupportFiles?: string;
  className?: string;
  subscriptionType?: SUBSCRIPTION_TYPE_ENUM;
  onUpload: (file: File | null, imgSize?: { width?: number; height?: number }) => void;
  preview?: string | null;
}

const UploadImage: React.FC<UploadImageProps> = ({
  position,
  name,
  accept = '.jpg,.jpeg,.jp2,.jpf,.jpx,.png', // default: JPG, JPEG2000, PNG
  titleWrapper,
  title,
  titleSupportFiles,
  className = '',
  subscriptionType = SUBSCRIPTION_TYPE_ENUM.BASIC,
  onUpload,
  preview: previewProps,
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const focusRef = useRef(null);

  useEffect(() => {
    if (previewProps) {
      setPreview(previewProps);
    }
  }, [previewProps]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        fileUpload(files[0], (previewUrl, imgSize) => {
          setPreview(previewUrl);
          onUpload(files[0], imgSize);
        });
      }
    },
    [onUpload]
  );

  const handleClick = () => {
    document.getElementById(name)?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      fileUpload(files[0], (previewUrl, imgSize) => {
        setPreview(previewUrl);
        onUpload(files[0], imgSize);
      });
    }
  };

  const handleRemovePreview = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPreview(null);
    // onUpload(null);
    const fileInput = document.getElementById(name) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <ToolWrapper position={position} title={titleWrapper || t('common:upload_your_image')}>
      <div
        className={`flex h-[300px] cursor-pointer items-center justify-center rounded-lg transition-colors ${
          preview ? 'border-transparent' : 'border-2 border-dashed dark:border-[#2E2E2E] hover:border-primary'
        } ${className}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleClick}
        ref={focusRef}
      >
        <div className="relative rounded-lg flex h-full w-full flex-col items-center justify-center hover:bg-[#F3E8FF] dark:hover:bg-[#2E2E2E]">
          {preview ? (
            <>
              <img
                src={preview}
                alt="preview"
                className="h-full w-full cursor-pointer rounded-lg object-cover"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen();
                }}
              />
              <div onClick={handleRemovePreview} className="absolute right-3 top-3 z-10 cursor-pointer">
                <CloseIcon />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <img src={img_placeholder} alt="img_placeholder" className="mb-4" />
              <p className="font-bold dark:text-white">{title || t('common:drop_your_image_here_or_click')}</p>
              <p className="text-sm text-[#6B6B6B]">{titleSupportFiles || t('common:supports_jpg_jpeg2000_png')}</p>
            </div>
          )}
        </div>
        <Input type="file" id={name} name={name} accept={accept} onChange={handleChange} display="none" key={preview} />
      </div>
      <Modal isOpen={isOpen} onClose={onClose} isCentered autoFocus={false} finalFocusRef={focusRef}>
        <ModalOverlay />
        <ModalContent borderRadius="8px" minWidth="600px" minHeight="600px">
          <div onClick={onClose} className="absolute right-3 top-3 z-10 cursor-pointer">
            <CloseIcon />
          </div>
          <Image src={preview || undefined} alt="modal_preview" maxW="100%" objectFit="cover" />
        </ModalContent>
      </Modal>
    </ToolWrapper>
  );
};

export default UploadImage;

