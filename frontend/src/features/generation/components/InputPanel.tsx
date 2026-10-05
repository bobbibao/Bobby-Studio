import { Box, Button, Flex, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Wrap, WrapItem } from '@chakra-ui/react';
import { Image as ImageIcon, PenLine, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudioMode } from '../scheduler/types';
import type { ReferenceDraft } from '../draft/draftState';
import type { ReferenceFileIssue } from '../hooks/referenceFile';
import { ReferenceInput } from './ReferenceInput';
import { SketchCanvas, type SketchCanvasProps } from './SketchCanvas';
import { focusRing, touchSize } from './styles';

const MODES: StudioMode[] = ['prompt', 'sketch', 'reference'];

/** Illustrative starting points shown as labeled examples; choosing one only fills the prompt. */
const EXAMPLE_KEYS = ['timber', 'library', 'courtyard'] as const;

interface InputPanelProps {
  mode: StudioMode;
  onMode(mode: StudioMode): void;
  sketch: SketchCanvasProps;
  reference: ReferenceDraft | null;
  referenceIssue: ReferenceFileIssue | null;
  referenceMaxBytes: number;
  onPickReference(file: File): void;
  onRemoveReference(): void;
  onExample(prompt: string): void;
}

/** Input mode switcher (Prompt / Sketch / Reference) and the matching work surface. */
export function InputPanel({ mode, onMode, sketch, reference, referenceIssue, referenceMaxBytes, onPickReference, onRemoveReference, onExample }: InputPanelProps) {
  const { t } = useTranslation('studio');
  const icons = { prompt: <Type size={16} aria-hidden="true" />, sketch: <PenLine size={16} aria-hidden="true" />, reference: <ImageIcon size={16} aria-hidden="true" /> };
  return (
    <Tabs index={MODES.indexOf(mode)} onChange={(index) => onMode(MODES[index])} isLazy lazyBehavior="unmount" variant="unstyled" display="flex" flexDirection="column" h="100%" minW={0}>
      <TabList gap={1} p={1} borderRadius="12px" bg="bg.subtle" w={{ base: '100%', md: 'auto' }} alignSelf="flex-start" aria-label={t('input.modes')}>
        {MODES.map((value) => (
          <Tab
            key={value}
            h={touchSize}
            px={{ base: 2, md: 3 }}
            gap={{ base: 1, md: 2 }}
            flex={{ base: 1, md: 'none' }}
            minW={0}
            justifyContent="center"
            borderRadius="9px"
            fontSize="sm"
            fontWeight="medium"
            color="text.secondary"
            _selected={{ bg: 'bg.surface', color: 'text.primary', boxShadow: 'sm' }}
            _focusVisible={focusRing}
          >
            {icons[value]}
            {t(`input.mode_${value}`)}
          </Tab>
        ))}
      </TabList>
      <TabPanels flex="1" minH={0} mt={3}>
        <TabPanel p={0} h="100%">
          <Flex direction="column" gap={3} borderWidth="1px" borderStyle="dashed" borderColor="border.default" borderRadius="12px" p={4} minH={{ base: '200px', md: '320px' }} justify="center">
            <Text fontWeight="semibold">{t('input.prompt_only_title')}</Text>
            <Text fontSize="sm" color="text.muted">
              {t('input.prompt_only_body')}
            </Text>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="text.muted" mb={2}>
                {t('input.examples')}
              </Text>
              <Wrap spacing={2}>
                {EXAMPLE_KEYS.map((key) => (
                  <WrapItem key={key}>
                    <Button size="sm" variant="outline" h="auto" minH={touchSize} whiteSpace="normal" textAlign="start" fontWeight="medium" lineHeight="short" py={2} onClick={() => onExample(t(`input.example_${key}`))} _focusVisible={focusRing}>
                      {t(`input.example_${key}`)}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          </Flex>
        </TabPanel>
        <TabPanel p={0} h="100%">
          <SketchCanvas {...sketch} />
        </TabPanel>
        <TabPanel p={0} h="100%">
          <ReferenceInput reference={reference} issue={referenceIssue} maxBytes={referenceMaxBytes} onPick={onPickReference} onRemove={onRemoveReference} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
