import React, { useCallback, useEffect, useState, useRef } from 'react';
import img_placeholder from '../assets/svg/image-placholder.svg';
import { Modal, ModalOverlay, ModalContent, Image, useDisclosure, Input, Box, Flex, Text, Icon, useColorMode, useColorModeValue, useToken } from '@chakra-ui/react';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import CloseIcon from '../shared/icons/CloseIcon';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';
import { fileUpload } from '@/utils/index';
import { useTranslation } from 'react-i18next';
import ImagePlaceholderIcon from '@/shared/icons/ImagePlacholderIcon';
import { useDrop } from 'react-dnd';

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

const ImageUploader: React.FC<UploadImageProps> = ({
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
  const focusRef = useRef<HTMLDivElement | null>(null);
  
  // Chakra color values using zinc colors
  const [iconColorLight, iconColorDark] = useToken('colors', ['zinc.600', 'zinc.400']);
  const iconColor = useColorModeValue(iconColorLight, iconColorDark);
  const containerBg = useColorModeValue('zinc.200', 'zinc.900');
  const headerBg = useColorModeValue('zinc.200', 'zinc.800');
  const contentBg = useColorModeValue('zinc.50', 'zinc.900');
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const numberBadgeBg = useColorModeValue('zinc.400', 'zinc.600');
  const numberBadgeColor = useColorModeValue('zinc.900', 'white');
  const borderColor = useColorModeValue('zinc.300', 'zinc.700');
  const hoverBg = useColorModeValue('zinc.100', 'zinc.800');
  const uploadAreaBorder = useColorModeValue('zinc.300', 'zinc.700');
  const uploadAreaHoverBorder = useColorModeValue('zinc.600', 'zinc.500');

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

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'IMAGE',
    drop: async (item: { path: string }) => {
      try {
        const response = await fetch(item.path);
        const blob = await response.blob();
        const filename = item.path.split('/').pop() || 'dropped-image.jpg';
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        fileUpload(file, (previewUrl, imgSize) => {
          setPreview(previewUrl);
          onUpload(file, imgSize);
        });
      } catch (error) {
        console.error('[ImageUploader] Failed to import dropped image:', error);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onUpload]);

  const combinedDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      drop(node);
      focusRef.current = node;
    },
    [drop]
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
    <Box bg={containerBg} borderRadius="8px" p={0}>
      <Box bg={headerBg} borderRadius="8px 8px 0 0" p={4} mb={0}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={3}>
            <Flex
              align="center"
              justify="center"
              w={5}
              h={5}
              bg={numberBadgeBg}
              borderRadius="full"
              color={numberBadgeColor}
              fontSize="sm"
              fontWeight="bold"
            >
              {position || 3}
            </Flex>
            <Text color={textColor} fontSize="sm" fontWeight="semibold">
              {titleWrapper || t('common:upload_your_image')}
            </Text>
            <Icon as={QuestionOutlineIcon} w={5} h={5} color={textColor} />
          </Flex>
          <Flex
            align="center"
            justify="center"
            w={6}
            h={6}
            borderRadius="full"
            border="2px solid"
            borderColor={preview ? 'green.500' : 'zinc.500'}
            bg={preview ? 'green.500' : 'transparent'}
          ></Flex>
        </Flex>
      </Box>

      <Box p={4} bg={contentBg} borderRadius="0 0 8px 8px">
        <Box
          h="300px"
          cursor="pointer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="lg"
          border={preview ? 'none' : '2px dashed'}
          borderColor={isOver ? uploadAreaHoverBorder : uploadAreaBorder}
          bg={isOver && !preview ? useColorModeValue('zinc.100', 'zinc.800') : 'transparent'}
          transition="all 0.2s"
          _hover={{
            borderColor: preview ? 'transparent' : uploadAreaHoverBorder,
            bg: preview ? 'transparent' : hoverBg,
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleClick}
          ref={combinedDropRef}
          className={className}
        >
          <Box position="relative" borderRadius="lg" w="full" h="full" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            {preview ? (
              <>
                <Image
                  src={preview}
                  alt="preview"
                  objectFit="cover"
                  w="full"
                  h="full"
                  borderRadius="lg"
                  cursor="pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen();
                  }}
                />
                <Box
                  onClick={handleRemovePreview}
                  position="absolute"
                  right={3}
                  top={3}
                  zIndex={10}
                  cursor="pointer"
                  bg="black"
                  bgOpacity={0.5}
                  _hover={{ bgOpacity: 0.7 }}
                  borderRadius="full"
                  p={1}
                  transition="all 0.2s"
                >
                  <CloseIcon />
                </Box>
              </>
            ) : (
              <Flex flexDirection="column" alignItems="center">
                <Box mb={4}>
                  <ImagePlaceholderIcon width={48} height={48} color={iconColor} />
                </Box>
                <Text fontWeight="bold" color={textColor} mb={1}>
                  {title || t('common:drop_your_image_here_or_click')}
                </Text>
                <Text fontSize="sm" color={mutedTextColor}>
                  {titleSupportFiles || t('common:supports_jpg_jpeg2000_png')}
                </Text>
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  {t('common:upload_restrictions', { defaultValue: 'No WebP or AVIF · Max 5MB' })}
                </Text>
              </Flex>
            )}
          </Box>
          <Input type="file" id={name} name={name} accept={accept} onChange={handleChange} display="none" key={preview} />
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered autoFocus={false} finalFocusRef={focusRef}>
        <ModalOverlay />
        <ModalContent borderRadius="8px" minWidth="600px" minHeight="600px">
          <div
            onClick={onClose}
            className="right-3 top-3 absolute z-10 cursor-pointer bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1 transition-all duration-200"
          >
            <CloseIcon />
          </div>
          <Image src={preview || undefined} alt="modal_preview" maxW="100%" objectFit="cover" />
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ImageUploader;

