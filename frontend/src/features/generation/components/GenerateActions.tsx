import { Button, Flex } from '@chakra-ui/react';
import { Sparkles, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SpinIcon } from './SpinIcon';
import { focusRing, touchSize } from './styles';

interface GenerateActionsProps {
  onGenerate(): void;
  onStop(): void;
  /** Generate is unavailable while an explicit final runs, or when the input cannot be submitted. */
  generateDisabled: boolean;
  generating: boolean;
  stoppable: boolean;
  block?: boolean;
}

export function GenerateActions({ onGenerate, onStop, generateDisabled, generating, stoppable, block }: GenerateActionsProps) {
  const { t } = useTranslation('studio');
  return (
    <Flex gap={2} w={block ? '100%' : undefined} align="stretch">
      <Button
        variant="primary"
        onClick={onGenerate}
        isDisabled={generateDisabled}
        h={touchSize}
        px={5}
        flex={block ? 1 : undefined}
        borderRadius="10px"
        aria-keyshortcuts="Control+Enter Meta+Enter"
        leftIcon={generating ? <SpinIcon /> : <Sparkles size={16} aria-hidden="true" />}
        _focusVisible={focusRing}
      >
        {generating ? t('actions.generating') : t('actions.generate')}
      </Button>
      {stoppable ? (
        <Button
          variant="outline"
          onClick={onStop}
          h={touchSize}
          borderRadius="10px"
          leftIcon={<Square size={14} aria-hidden="true" />}
          _focusVisible={focusRing}
        >
          {t('actions.stop')}
        </Button>
      ) : null}
    </Flex>
  );
}
