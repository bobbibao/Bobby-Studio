import React, { useCallback, useEffect, useState, useRef } from 'react';
import img_placeholder from '../assets/svg/image-placholder.svg';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Image,
  useDisclosure,
  Input,
  Box,
} from '@chakra-ui/react';
import CloseIcon from '../shared/icons/CloseIcon';
import { classNames, fileUpload } from '@/utils/index';
import { useTranslation } from 'react-i18next';

interface UploadImageProps {
  name: string;
  onUpload: (file: File | null) => void;
  preview?: string | null;
  disable?: boolean;
}

const UploadImageProfile: React.FC<UploadImageProps> = ({
  name,
  onUpload,
  preview: previewProps,
  disable = false,
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
        fileUpload(
          files[0],
          (file, imgSize) => {
            setPreview(file);
            onUpload(file as any);
          }
        );
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
      fileUpload(
        files[0],
        (file, imgSize) => {
          setPreview(file);
          onUpload(file as any);
        }
      );
    }
  };

  const handleRemovePreview = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disable) return;
    event.stopPropagation();
    setPreview(null);
    // onUpload(null);
    const fileInput = document.getElementById(name) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="flex flex-row gap-6 items-start">
      {preview && (
        <div className="h-[60px] w-[60px]">
          <img
            src={preview}
            alt="preview"
            className="h-full w-full cursor-pointer rounded-full object-cover"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          />
          {!disable && (
            <div
              onClick={handleRemovePreview}
              className="absolute right-3 top-3 z-10 cursor-pointer"
            >
              <CloseIcon />
            </div>
          )}
        </div>
      )}
      {!preview && (
        <Box
          boxSize="60px"
          borderRadius="full"
          className="h-[60px] w-[60px] bg-gray-100 dark:bg-gray-100/60"
        />
      )}

      <div
        className={classNames(
          'flex w-[calc(100%-64px)] p-8 gap-6 cursor-pointer items-center justify-center rounded-lg',
          'transition-colors border-2 border-dashed dark:border-[#2E2E2E] ',
          disable ? '!cursor-not-allowed' : 'hover:border-primary hover:bg-[#F3E8FF] dark:hover:bg-[#2E2E2E]'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleClick}
        ref={focusRef}
      >
        <div className="relative flex h-full w-full flex-row items-center justify-center">
          <div className="flex flex-col items-center">
            <img src={img_placeholder} alt="img_placeholder" className="mb-4" />
            <p className="font-bold dark:text-white">
              {t('common:drop_your_image_here_or_click')}
            </p>
            <p className="text-sm text-[#6B6B6B]">
              {t('common:supports_jpg_jpeg2000_png')}
            </p>
          </div>
        </div>
        <Input
          type="file"
          id={name}
          name={name}
          accept="image/*"
          onChange={handleChange}
          display="none"
          key={preview}
          disabled={disable}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        autoFocus={false}
        finalFocusRef={focusRef}
      >
        <ModalOverlay />
        <ModalContent borderRadius="8px" minWidth="600px" minHeight="600px">
          <div
            onClick={onClose}
            className="absolute right-3 top-3 z-10 cursor-pointer"
          >
            <CloseIcon />
          </div>
          <Image
            src={preview || undefined}
            alt="modal_preview"
            maxW="100%"
            objectFit="cover"
            loading="lazy"
          />
        </ModalContent>
      </Modal>
    </div>
  );
};

export default UploadImageProfile;

