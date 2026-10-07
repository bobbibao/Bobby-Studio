import { Button, Flex, Box } from '@chakra-ui/react';
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
    <Flex gap={2} w={block ? '100%' : undefined} align="stretch" position="relative">
      <Button
        variant="primary"
        onClick={onGenerate}
        isDisabled={generateDisabled}
        h={touchSize}
        px={6}
        flex={block ? 1 : undefined}
        borderRadius="12px"
        bg={
          generating
            ? 'linear-gradient(135deg, #6366F1 0%, #7F56D9 50%, #06B6D4 100%)'
            : 'linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)'
        }
        color="white"
        boxShadow={
          generateDisabled
            ? 'none'
            : generating
            ? '0 0 25px rgba(6, 182, 212, 0.45)'
            : '0 4px 18px -2px rgba(127, 86, 217, 0.4)'
        }
        _hover={{
          bg: 'linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)',
          boxShadow: '0 6px 24px -2px rgba(127, 86, 217, 0.55)',
          transform: generateDisabled ? 'none' : 'translateY(-1px)',
        }}
        _active={{
          transform: 'translateY(0)',
        }}
        transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
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
          borderRadius="12px"
          borderColor="red.300"
          color="red.400"
          _hover={{ bg: 'red.500', color: 'white', borderColor: 'red.500' }}
          leftIcon={<Square size={14} aria-hidden="true" />}
          _focusVisible={focusRing}
        >
          {t('actions.stop')}
        </Button>
      ) : null}
    </Flex>
  );
}
