import { Box, Flex, Heading, Image, Text } from '@chakra-ui/react';
import { BookmarkCheck, Check, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VersionView } from '../hooks/useRealtimeGeneration';
import { focusRing, panelStyle } from './styles';
import { isExpired } from './useExpiry';

interface VersionStripProps {
  versions: readonly VersionView[];
  selectedJobId: string | null;
  onSelect(jobId: string): void;
}

/** Session versions, oldest first. Finals have their own entries and are never overwritten by previews. */
export function VersionStrip({ versions, selectedJobId, onSelect }: VersionStripProps) {
  const { t } = useTranslation('studio');
  let previews = 0;
  let finals = 0;
  const labelled = versions.map((version) => {
    const index = version.job.intent === 'final' ? (finals += 1) : (previews += 1);
    return { version, label: t(version.job.intent === 'final' ? 'versions.final_n' : 'versions.preview_n', { n: index }) };
  });
  return (
    <Box as="section" aria-label={t('versions.title')} {...panelStyle} p={3} minW={0}>
      <Heading as="h2" size="xs" fontWeight="semibold" mb={2}>
        {t('versions.title')}
      </Heading>
      {labelled.length === 0 ? (
        <Text fontSize="sm" color="text.muted">
          {t('versions.empty')}
        </Text>
      ) : (
        <Flex as="ul" gap={2} overflowX="auto" listStyleType="none" m={0} p={1} role="list" tabIndex={-1}>
          {labelled.map(({ version, label }) => {
            const selected = selectedJobId === version.job.jobId;
            const saved = Boolean(version.asset?.saved);
            const unavailable = !version.asset || isExpired(version.snapshot?.expiresAt ?? null, saved, Date.now());
            return (
              <Box as="li" key={version.job.jobId} flexShrink={0}>
                <Box
                  as="button"
                  type="button"
                  aria-pressed={selected}
                  aria-label={t('versions.item_label', { label, state: saved ? t('result.saved') : t('result.unsaved') })}
                  onClick={() => onSelect(version.job.jobId)}
                  position="relative"
                  w="88px"
                  textAlign="start"
                  borderRadius="14px"
                  borderWidth="2px"
                  borderColor={selected ? 'brand.500' : 'border.default'}
                  boxShadow={selected ? '0 0 15px rgba(127, 86, 217, 0.4)' : 'none'}
                  transform={selected ? 'translateY(-1px)' : 'none'}
                  p={1.5}
                  bg="bg.surface"
                  transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                  _focusVisible={focusRing}
                  _hover={{ borderColor: selected ? 'brand.500' : 'brand.300', transform: 'translateY(-1px)' }}
                >
                  <Box w="100%" h="64px" borderRadius="10px" overflow="hidden" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
                    {unavailable ? (
                      <ImageOff size={18} aria-hidden="true" />
                    ) : (
                      <Image src={version.asset?.thumbnailUrl ?? version.asset?.url} alt="" loading="lazy" w="100%" h="100%" objectFit="cover" />
                    )}
                  </Box>
                  <Flex align="center" gap={1} mt={1} fontSize="11px" lineHeight="1.2">
                    {selected ? <Check size={11} aria-hidden="true" /> : null}
                    <Text as="span" noOfLines={1}>
                      {label}
                    </Text>
                    {saved ? <BookmarkCheck size={11} aria-hidden="true" /> : null}
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}
