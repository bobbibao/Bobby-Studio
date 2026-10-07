import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { focusRing, reducedMotion } from './styles';

interface RealtimeSwitchProps {
  checked: boolean;
  onChange(next: boolean): void;
  /** Credits one automatic preview costs, shown as the visible usage control. */
  creditsPerPreview: number | null;
  paused?: string | null;
  disabled?: boolean;
}

/** A real switch: role="switch" with aria-checked, labelled by its visible text. */
export function RealtimeSwitch({ checked, onChange, creditsPerPreview, paused, disabled }: RealtimeSwitchProps) {
  const { t } = useTranslation('studio');
  const labelId = useId();
  const hintId = useId();
  return (
    <Flex align="center" gap={2.5} minH={{ base: '44px', md: '36px' }}>
      <chakra.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        minW="44px"
        minH={{ base: '44px', md: '32px' }}
        bg="transparent"
        borderRadius="full"
        _focusVisible={focusRing}
        _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        <Box
          position="relative"
          w="44px"
          h="26px"
          borderRadius="full"
          borderWidth="1px"
          borderColor={checked ? 'brand.400' : 'border.default'}
          bg={checked ? 'linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)' : 'bg.muted'}
          boxShadow={checked ? '0 0 14px rgba(127, 86, 217, 0.45)' : 'none'}
          transition="all 200ms cubic-bezier(0.16, 1, 0.3, 1)"
          sx={reducedMotion}
        >
          <Box
            position="absolute"
            top="2px"
            insetInlineStart={checked ? '20px' : '2px'}
            w="20px"
            h="20px"
            borderRadius="full"
            bg="white"
            boxShadow="0 2px 5px rgba(0,0,0,0.2)"
            transition="inset-inline-start 200ms cubic-bezier(0.16, 1, 0.3, 1)"
            sx={reducedMotion}
          />
        </Box>
      </chakra.button>
      <Box minW={0}>
        <Text id={labelId} fontSize="sm" fontWeight="600" lineHeight="short">
          {t('realtime.label')}
        </Text>
        <Text id={hintId} fontSize="xs" color="text.muted" lineHeight="short">
          {paused
            ? paused
            : creditsPerPreview !== null
              ? t('realtime.usage', { count: creditsPerPreview })
              : t('realtime.usage_unknown')}
        </Text>
      </Box>
    </Flex>
  );
}
