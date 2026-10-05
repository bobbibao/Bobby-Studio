import { HStack, IconButton, Text, Tooltip } from '@chakra-ui/react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { focusRing, touchSize } from './styles';

interface ZoomControlsProps {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
}

export function ZoomControls({ zoom, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  const { t, i18n } = useTranslation('studio');
  const buttonProps = { variant: 'ghost', size: 'sm', minW: touchSize, h: touchSize, _focusVisible: focusRing } as const;
  return (
    <HStack spacing={1} role="group" aria-label={t('zoom.group')}>
      <Tooltip label={t('zoom.out')} hasArrow>
        <IconButton aria-label={t('zoom.out')} icon={<ZoomOut size={16} />} onClick={onZoomOut} isDisabled={!canZoomOut} {...buttonProps} />
      </Tooltip>
      <Text fontSize="xs" color="text.muted" minW="40px" textAlign="center" aria-live="off">
        {new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(zoom)}
      </Text>
      <Tooltip label={t('zoom.in')} hasArrow>
        <IconButton aria-label={t('zoom.in')} icon={<ZoomIn size={16} />} onClick={onZoomIn} isDisabled={!canZoomIn} {...buttonProps} />
      </Tooltip>
      <Tooltip label={t('zoom.fit')} hasArrow>
        <IconButton aria-label={t('zoom.fit')} icon={<Maximize size={16} />} onClick={onFit} {...buttonProps} />
      </Tooltip>
    </HStack>
  );
}
