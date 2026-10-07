import { Box, FormControl, FormErrorMessage, FormLabel, Text, Textarea } from '@chakra-ui/react';
import { useId, type ChangeEvent, type CompositionEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { focusRing } from './styles';

interface PromptFieldProps {
  value: string;
  maxChars: number;
  onChange(value: string): void;
  onCompositionStart(): void;
  onCompositionEnd(value: string): void;
  error?: string | null;
  inputRef?: RefObject<HTMLTextAreaElement>;
  rows?: number;
}

export function PromptField({ value, maxChars, onChange, onCompositionStart, onCompositionEnd, error, inputRef, rows = 6 }: PromptFieldProps) {
  const { t, i18n } = useTranslation('studio');
  const counterId = useId();
  const length = value.trim().length;
  const over = length > maxChars;
  return (
    <FormControl isInvalid={Boolean(error) || over}>
      <FormLabel htmlFor="studio-prompt" fontSize="sm" fontWeight="600" mb={2}>
        {t('prompt.label')}
      </FormLabel>
      <Textarea
        id="studio-prompt"
        ref={inputRef}
        value={value}
        rows={rows}
        resize="vertical"
        dir="auto"
        placeholder={t('prompt.placeholder')}
        aria-describedby={counterId}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={(event: CompositionEvent<HTMLTextAreaElement>) => onCompositionEnd(event.currentTarget.value)}
        _focusVisible={focusRing}
        fontSize="md"
        minH="120px"
        borderRadius="14px"
        borderColor="border.default"
        bg="bg.surface"
        transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        _hover={{ borderColor: 'brand.400' }}
        _focus={{
          borderColor: 'brand.400',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-400), 0 0 20px -3px rgba(127, 86, 217, 0.3)',
        }}
        wordBreak="break-word"
      />
      <Box id={counterId} display="flex" justifyContent="space-between" gap={2} mt={1.5}>
        <Text fontSize="xs" color="text.muted">
          {t('prompt.hint')}
        </Text>
        <Text fontSize="xs" color={over ? 'red.500' : 'text.muted'} fontWeight={over ? 'semibold' : 'normal'} flexShrink={0}>
          {t('prompt.counter', {
            current: new Intl.NumberFormat(i18n.language).format(length),
            max: new Intl.NumberFormat(i18n.language).format(maxChars),
          })}
        </Text>
      </Box>
      {over ? <FormErrorMessage>{t('issues.prompt_too_long')}</FormErrorMessage> : null}
      {error && !over ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
}
