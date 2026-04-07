import React, { useCallback, useEffect, useState, useRef } from 'react';
import img_placeholder from '../assets/svg/image-placholder.svg';
import { Input, Box, useColorModeValue, Flex, Text, Image, useToken, Spinner } from '@chakra-ui/react';
import CloseIcon from '../shared/icons/CloseIcon';
import { fileUpload } from '@/utils/index';
import { useTranslation } from 'react-i18next';
import ImagePlaceholderIcon from '@/shared/icons/ImagePlacholderIcon';
import { useDrop } from 'react-dnd';

interface UploadImageProps {
  name: string;
  accept?: string;
  title?: string;
  titleSupportFiles?: string;
  className?: string;
  onUpload: (file: File | null, imgSize?: { width?: number; height?: number }) => void;
  preview?: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
}

const ImageSpaceUploader: React.FC<UploadImageProps> = ({
  name,
  accept = '.jpg,.jpeg,.jp2,.jpf,.jpx,.png', // default: JPG, JPEG2000, PNG
  title,
  titleSupportFiles,
  className = '',
  onUpload,
  preview: previewProps,
  isUploading = false,
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);

  // Chakra color values using zinc colors
  const [iconColorLight, iconColorDark] = useToken('colors', ['zinc.600', 'zinc.400']);
  const iconColor = useColorModeValue(iconColorLight, iconColorDark);
  const containerBg = useColorModeValue('zinc.50', 'zinc.900');
  const contentBg = useColorModeValue('zinc.50', 'zinc.900');
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
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

  const inferMimeType = (filename: string, fallback: string = 'image/jpeg') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return fallback;
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'jp2' || ext === 'jpf' || ext === 'jpx') return 'image/jp2';
    return fallback;
  };

  const handleWorkspaceImageDrop = useCallback(
    async (path: string) => {
      if (!path) return;
      try {
        const response = await fetch(path, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch image. Status: ${response.status}`);
        }
        const blob = await response.blob();
        const filename = path.split('/').pop()?.split('?')[0] || 'dropped-image.jpg';
        const mimeType = blob.type || inferMimeType(filename);
        const file = new File([blob], filename, { type: mimeType });
        fileUpload(file, (previewUrl, imgSize) => {
          setPreview(previewUrl);
          onUpload(file, imgSize);
        });
      } catch (error) {
        console.error('[ImageSpaceUploader] Failed to import dropped image:', error);
      }
    },
    [onUpload]
  );

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'IMAGE',
      drop: (item: { path: string }) => {
        if (item?.path) {
          handleWorkspaceImageDrop(item.path);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [handleWorkspaceImageDrop]
  );

  const combinedDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      drop(node);
      focusRef.current = node;
    },
    [drop]
  );

  return (
    <Box bg={containerBg} borderRadius="8px" p={0}>
      <Box p={0} bg={contentBg} borderRadius="0 0 8px 8px">
        <Box
          minH="300px"
          minW="400px"
          cursor={isUploading ? 'default' : 'pointer'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition="all 0.2s"
          border={preview ? 'none' : '2px dashed'}
          borderColor={isOver ? uploadAreaHoverBorder : uploadAreaBorder}
          bg={isOver && !preview ? useColorModeValue('zinc.100', 'zinc.800') : 'transparent'}
          _hover={{
            borderColor: preview ? 'transparent' : uploadAreaHoverBorder,
          }}
          onDrop={isUploading ? undefined : handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={isUploading ? undefined : handleClick}
          ref={combinedDropRef}
          className={className}
          position="relative"
        >
          <Box position="relative" w="full" h="full" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            {preview ? (
              <>
                <Image
                  src={preview}
                  alt="preview"
                  objectFit="cover"
                  w="full"
                  h="full"
                  cursor="pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  opacity={isUploading ? 0.5 : 1}
                  transition="opacity 0.2s"
                />
                {!isUploading && (
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
                )}
              </>
            ) : (
              <Flex flexDirection="column" alignItems="center" py={4}>
                <Box mb={3}>
                  <ImagePlaceholderIcon width={48} height={48} color={iconColor} />
                </Box>
                <Text fontWeight="semibold" fontSize="md" color={textColor} mb={4}>
                  {title || t('common:drop_your_image_here_or_click')}
                </Text>
                <Flex gap={2} mb={5} flexWrap="wrap" justifyContent="center" px={4}>
                  {[
                    t('common:upload_your_input_here', { defaultValue: 'Upload your Input here' }),
                    t('common:sketch', { defaultValue: 'Sketch' }),
                    t('common:image_to_edit', { defaultValue: 'Image to Edit' }),
                    t('common:3d_model_screenshot', { defaultValue: '3D Model Screenshot' }),
                  ].map((label) => (
                    <Box
                      key={label}
                      px={3}
                      py={1.5}
                      borderRadius="full"
                      borderWidth="1px"
                      borderColor={borderColor}
                      bg="transparent"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ bg: hoverBg, borderColor: uploadAreaHoverBorder, transform: 'translateY(-1px)' }}
                      _active={{ transform: 'translateY(0px)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick();
                      }}
                    >
                      <Text fontSize="xs" fontWeight="medium" color={mutedTextColor} whiteSpace="nowrap">
                        {label}
                      </Text>
                    </Box>
                  ))}
                </Flex>
                <Text fontSize="xs" color={mutedTextColor}>
                  {titleSupportFiles || t('common:supports_jpg_jpeg2000_png')} · {t('common:upload_restrictions', { defaultValue: 'No WebP or AVIF · Max 5MB' })}
                </Text>
              </Flex>
            )}
          </Box>

          {/* Upload Loading Overlay */}
          {isUploading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="blackAlpha.600"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              borderRadius="8px"
              zIndex={20}
            >
              <Spinner thickness="4px" speed="0.65s" emptyColor="whiteAlpha.300" color="primary.500" size="xl" />
              <Text color="white" mt={4} fontWeight="medium" fontSize="sm">
                {t('common:uploading', 'Uploading...')}
              </Text>
            </Box>
          )}

          <Input type="file" id={name} name={name} accept={accept} onChange={handleChange} display="none" key={preview} />
        </Box>
      </Box>
    </Box>
  );
};

export default ImageSpaceUploader;

