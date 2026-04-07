import { Box, Flex, IconButton, Text, useClipboard } from '@chakra-ui/react';
import { CopyIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

interface ImageInfoOverlayProps {
  isVisible: boolean;
  createdAt?: string | Date;
  prompt?: string | null;
  model?: string | string[] | null;
  onClose?: () => void;
  isLoading?: boolean;
  typeLabel?: string | null;
  zIndex?: number;
}

const ImageInfoOverlay: React.FC<ImageInfoOverlayProps> = ({
  isVisible,
  createdAt,
  prompt,
  model,
  onClose,
  isLoading = false,
  typeLabel,
  zIndex = 30,
}) => {
  const { t } = useTranslation('common');
  const resolvedModel = useMemo(() => {
    if (Array.isArray(model)) {
      return model.filter(Boolean).join(', ');
    }
    return model || '';
  }, [model]);

  const formattedDate = useMemo(() => {
    if (!createdAt) return '';
    const date = typeof createdAt === 'string' || typeof createdAt === 'number' ? new Date(createdAt) : createdAt;
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const currentLanguage = i18n.language || 'en';

    // Format date as DD/MM/YYYY
    const formattedDateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Format time based on language (24-hour for German and Vietnamese, 12-hour for others)
    const isGerman = currentLanguage.toLowerCase().startsWith('de');
    const isViet = currentLanguage.toLowerCase().startsWith('vi');
    const formattedTime = date.toLocaleTimeString(isGerman || isViet ? 'de-DE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !(isGerman || isViet),
    });

    // Check if it's today
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (isToday) {
      return `${t('today')} - ${formattedDateStr}, ${formattedTime}`;
    }

    return `${formattedDateStr}, ${formattedTime}`;
  }, [createdAt, t]);
  const { hasCopied, onCopy } = useClipboard(prompt || '');

  if (!isVisible) {
    return null;
  }

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!prompt) return;
    onCopy();
  };

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClose?.();
  };

  const buttonBg = 'rgba(255, 255, 255, 0.12)';
  const buttonHoverBg = 'rgba(255, 255, 255, 0.28)';
  const promptValue = prompt?.trim();
  const displayPrompt = promptValue && promptValue.length > 0 ? promptValue : isLoading ? t('loading_prompt') : '-';

  return (
    <Box
      className="absolute inset-0"
      bg="rgba(0,0,0,0.82)"
      color="white"
      display="flex"
      flexDirection="column"
      justifyContent="flex-end"
      px={4}
      py={4}
      zIndex={zIndex}
      pointerEvents="auto"
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          {typeLabel && (
            <Text fontSize="sm" fontWeight="semibold" color="white" mb={1}>
              {typeLabel}
            </Text>
          )}
          <Text fontSize="xs" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="0.08em">
            {formattedDate || '-'}
          </Text>
        </Box>
        <IconButton
          aria-label={t('close_image_info')}
          icon={<CloseIcon />}
          size="sm"
          variant="unstyled"
          onClick={handleClose}
          className="!rounded-md"
          bg={buttonBg}
          border="1px solid rgba(255, 255, 255, 0.18)"
          color="white"
          _hover={{ bg: buttonHoverBg }}
        />
      </Flex>

      <Box mt={4}>
        <Text fontSize="xs" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
          {t('generate:prompt')}
        </Text>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" flex="1" noOfLines={2}>
            {displayPrompt}
          </Text>
          {prompt && (
            <IconButton
              aria-label={t('copy_prompt')}
              icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
              size="sm"
              variant="unstyled"
              onClick={handleCopy}
              className="!rounded-md"
              bg={buttonBg}
              border="1px solid rgba(255, 255, 255, 0.18)"
              color="white"
              _hover={{ bg: buttonHoverBg }}
            />
          )}
        </Flex>
      </Box>

      <Box mt={4}>
        <Text fontSize="xs" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
          {t('ai_model_used')}
        </Text>
        <Text fontSize="sm">{resolvedModel || '-'}</Text>
      </Box>
    </Box>
  );
};

export default ImageInfoOverlay;

