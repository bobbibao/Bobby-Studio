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
      <FormLabel htmlFor="studio-prompt" fontSize="sm" fontWeight="semibold" mb={1.5}>
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
