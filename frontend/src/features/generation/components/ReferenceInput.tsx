import { Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import { AlertCircle, CheckCircle2, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReferenceDraft } from '../draft/draftState';
import { firstImageFile, type ReferenceFileIssue } from '../hooks/referenceFile';
import { formatBytes } from './format';
import { SpinIcon } from './SpinIcon';
import { StatusChip } from './StatusChip';
import { focusRing, panelStyle, touchSize } from './styles';

interface ReferenceInputProps {
  reference: ReferenceDraft | null;
  issue: ReferenceFileIssue | null;
  maxBytes: number;
  onPick(file: File): void;
  onRemove(): void;
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/** File picker + drag and drop + paste. The reference is shown and submitted as uploaded, never altered. */
export function ReferenceInput({ reference, issue, maxBytes, onPick, onRemove }: ReferenceInputProps) {
  const { t, i18n } = useTranslation('studio');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const helpId = useId();

  // Pasting an image anywhere in the studio (outside text fields) attaches it while this mode is open.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) {
        return;
      }
      const file = firstImageFile(event.clipboardData?.files);
      if (file) {
        event.preventDefault();
        onPick(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onPick]);

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = firstImageFile(event.dataTransfer.files);
    if (file) {
      onPick(file);
    }
  };

  const issueText = issue ? t(`reference.issue_${issue}`, { max: formatBytes(maxBytes, i18n.language) }) : null;

  return (
    <Flex direction="column" gap={3} h="100%" minW={0}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label={t('reference.choose')}
        data-testid="reference-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onPick(file);
          }
        }}
      />
      <Box
        {...panelStyle}
        borderStyle="dashed"
        borderWidth="2px"
        borderColor={dragging ? 'brand.500' : 'border.default'}
        bg={dragging ? 'bg.subtle' : 'bg.surface'}
        flex="1"
        minH={{ base: '260px', md: '320px' }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        position="relative"
        onDragOver={(event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="group"
        aria-label={t('reference.dropzone')}
        aria-describedby={helpId}
      >
        {reference ? (
          <Flex direction="column" align="center" gap={3} w="100%" h="100%" minH={0}>
            {reference.previewUrl ? (
              <Image src={reference.previewUrl} alt={t('reference.preview_alt', { name: reference.name })} maxW="100%" maxH="100%" objectFit="contain" flex="1" minH={0} borderRadius="8px" />
            ) : (
              <Flex flex="1" align="center" justify="center" direction="column" gap={2} color="text.muted">
                <ImagePlus size={32} aria-hidden="true" />
                <Text fontSize="sm">{t('reference.no_preview')}</Text>
              </Flex>
            )}
            <Flex wrap="wrap" align="center" justify="center" gap={2}>
              <Text fontSize="sm" fontWeight="medium" noOfLines={1} maxW="220px" title={reference.name}>
                {reference.name}
              </Text>
              <Text fontSize="xs" color="text.muted">
                {formatBytes(reference.byteSize, i18n.language)}
              </Text>
              {reference.status === 'uploading' ? (
                <StatusChip tone="info" icon={<SpinIcon size={12} />}>
                  {t('reference.uploading')}
                </StatusChip>
              ) : null}
              {reference.status === 'ready' ? (
                <StatusChip tone="success" icon={<CheckCircle2 size={12} aria-hidden="true" />}>
                  {t('reference.ready')}
                </StatusChip>
              ) : null}
              {reference.status === 'error' ? (
                <StatusChip tone="danger" icon={<AlertCircle size={12} aria-hidden="true" />}>
                  {t('reference.failed')}
                </StatusChip>
              ) : null}
            </Flex>
            <Flex gap={2}>
              <Button variant="outline" size="sm" h={touchSize} onClick={() => inputRef.current?.click()} _focusVisible={focusRing}>
                {t('reference.replace')}
              </Button>
              <Button variant="outline" size="sm" h={touchSize} leftIcon={<Trash2 size={14} aria-hidden="true" />} onClick={onRemove} _focusVisible={focusRing}>
                {t('reference.remove')}
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" align="center" gap={3} textAlign="center">
            <ImagePlus size={36} aria-hidden="true" />
            <Text fontWeight="semibold">{t('reference.title')}</Text>
            <Text fontSize="sm" color="text.muted" maxW="320px">
              {t('reference.body')}
            </Text>
            <Button variant="primary" h={touchSize} onClick={() => inputRef.current?.click()} leftIcon={<ImagePlus size={16} aria-hidden="true" />} _focusVisible={focusRing}>
              {t('reference.choose')}
            </Button>
          </Flex>
        )}
      </Box>
      <Text id={helpId} fontSize="xs" color="text.muted">
        {t('reference.help', { max: formatBytes(maxBytes, i18n.language) })}
      </Text>
      <Box role="status" aria-live="polite" minH="1.25rem">
        {issueText ? (
          <StatusChip tone="danger" icon={<AlertCircle size={12} aria-hidden="true" />}>
            {issueText}
          </StatusChip>
        ) : null}
      </Box>
    </Flex>
  );
}
