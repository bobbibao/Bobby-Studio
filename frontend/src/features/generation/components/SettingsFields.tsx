import { Box, FormControl, FormErrorMessage, FormHelperText, FormLabel, Select, Stack } from '@chakra-ui/react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CatalogModel, GenerationQuality, GenerationSize } from '../contracts';
import type { FieldError } from '../scheduler/types';
import { aspectLabel } from './format';
import { StatusChip } from './StatusChip';
import { focusRing, touchSize } from './styles';

interface SettingsFieldsProps {
  models: readonly CatalogModel[];
  model: CatalogModel | null;
  size: GenerationSize | null;
  quality: GenerationQuality;
  onModel(modelId: string): void;
  onSize(size: GenerationSize): void;
  onQuality(quality: GenerationQuality): void;
  fieldErrors?: readonly FieldError[];
  idPrefix?: string;
}

const selectProps = {
  _focusVisible: focusRing,
  h: touchSize,
  borderRadius: '12px',
  borderColor: 'border.default',
  bg: 'bg.surface',
  fontSize: 'sm',
  transition: 'all 0.2s',
  _hover: { borderColor: 'brand.400' },
} as const;

/** Model, aspect ratio and quality from the catalog's capabilities. Provider details are never shown. */
export function SettingsFields({ models, model, size, quality, onModel, onSize, onQuality, fieldErrors = [], idPrefix = 'studio' }: SettingsFieldsProps) {
  const { t } = useTranslation('studio');
  const errorFor = (field: string) => fieldErrors.find((entry) => entry.field === field)?.message;
  const sizes = model?.capabilities.sizes ?? [];
  const qualities = model?.capabilities.qualities ?? [];
  return (
    <Stack spacing={4}>
      <FormControl isInvalid={Boolean(errorFor('modelId'))}>
        <FormLabel htmlFor={`${idPrefix}-model`} fontSize="sm" fontWeight="semibold" mb={1.5}>
          {t('settings.model')}
        </FormLabel>
        <Select
          id={`${idPrefix}-model`}
          value={model?.id ?? ''}
          onChange={(event) => onModel(event.target.value)}
          isDisabled={models.length === 0}
          placeholder={models.length === 0 ? t('settings.no_models') : undefined}
          {...selectProps}
        >
          {models.map((candidate) => (
            <option key={candidate.id} value={candidate.id} disabled={!candidate.entitled}>
              {candidate.entitled ? candidate.displayName : t('settings.model_locked', { name: candidate.displayName })}
            </option>
          ))}
        </Select>
        {model?.isSimulated ? (
          <Box mt={2}>
            <StatusChip tone="info" icon={<Sparkles size={12} aria-hidden="true" />}>
              {t('settings.simulated')}
            </StatusChip>
          </Box>
        ) : null}
        <FormErrorMessage>{errorFor('modelId')}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errorFor('size'))}>
        <FormLabel htmlFor={`${idPrefix}-size`} fontSize="sm" fontWeight="semibold" mb={1.5}>
          {t('settings.aspect')}
        </FormLabel>
        <Select
          id={`${idPrefix}-size`}
          value={size ? `${size.width}x${size.height}` : ''}
          onChange={(event) => {
            const next = sizes.find((candidate) => `${candidate.width}x${candidate.height}` === event.target.value);
            if (next) {
              onSize(next);
            }
          }}
          isDisabled={sizes.length === 0}
          {...selectProps}
        >
          {sizes.map((candidate) => (
            <option key={`${candidate.width}x${candidate.height}`} value={`${candidate.width}x${candidate.height}`}>
              {t('settings.size_option', { ratio: aspectLabel(candidate), width: candidate.width, height: candidate.height })}
            </option>
          ))}
        </Select>
        <FormErrorMessage>{errorFor('size')}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errorFor('quality'))}>
        <FormLabel htmlFor={`${idPrefix}-quality`} fontSize="sm" fontWeight="semibold" mb={1.5}>
          {t('settings.quality')}
        </FormLabel>
        <Select
          id={`${idPrefix}-quality`}
          value={quality}
          onChange={(event) => {
            const next = qualities.find((candidate) => candidate === event.target.value);
            if (next) {
              onQuality(next);
            }
          }}
          isDisabled={qualities.length === 0}
          {...selectProps}
        >
          {qualities.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t('settings.quality_option', { quality: t(`settings.quality_${candidate}`), count: model?.creditEstimate[candidate] ?? 0 })}
            </option>
          ))}
        </Select>
        <FormHelperText fontSize="xs">{t('settings.quality_hint')}</FormHelperText>
        <FormErrorMessage>{errorFor('quality')}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}
