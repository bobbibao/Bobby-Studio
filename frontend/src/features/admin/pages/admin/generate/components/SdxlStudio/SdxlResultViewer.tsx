import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Heading,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Download, Maximize2, RefreshCcw } from 'lucide-react';
import { SdxlGenerationMetadata } from '@/types/sdxl';

interface SdxlResultViewerProps {
  isGenerating: boolean;
  result: any;
  sourceImage?: string | null;
  metadata: SdxlGenerationMetadata;
  elapsedSeconds?: number | null;
  onRegenerate: () => void;
}

const pickResultUrl = (result: any): string | undefined =>
  result?.generatedImage?.location ||
  result?.generatedImage?.thumbnail ||
  result?.imagePath ||
  result?.path ||
  result?.result ||
  result?.editedImageUrl;

const metadataRows = (metadata: SdxlGenerationMetadata, elapsedSeconds?: number | null) => [
  ['Generation Mode', metadata.mode.replace(/_/g, ' ')],
  ['Model', 'SDXL + ControlNet + LoRA'],
  ['Structure Strength', metadata.controlnetScale?.toFixed(2) ?? '-'],
  ['Creativity', metadata.guidanceScale.toFixed(1)],
  ['Inference Quality', `${metadata.inferenceSteps} steps`],
  ['Aspect Ratio', `${metadata.width} × ${metadata.height}`],
  ['Reproducibility', metadata.seed === undefined ? 'random' : `seed: ${metadata.seed}`],
  ['Generation Time', elapsedSeconds ? `${elapsedSeconds}s` : 'pending'],
];

const SdxlResultViewer: React.FC<SdxlResultViewerProps> = ({
  isGenerating,
  result,
  sourceImage,
  metadata,
  elapsedSeconds,
  onRegenerate,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [comparisonSlider, setComparisonSlider] = useState(50);
  const resultUrl = pickResultUrl(result);

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `architectural-visualization-${Date.now()}.png`;
    link.click();
  };

  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="24px"
      p={{ base: 4, xl: 6 }}
      h="100%"
      boxShadow="0 18px 60px rgba(15, 23, 42, 0.06)"
    >
      <Flex justify="space-between" align="center" mb={4} gap={3}>
        <Box>
          <Heading size="md">✨ Generated Result</Heading>
          <Text color="text.muted" fontSize="sm">
            Your architectural visualization with sketch conditioning and LoRA enhancement
          </Text>
        </Box>
        <Badge colorScheme={isGenerating ? 'orange' : resultUrl ? 'green' : 'gray'} borderRadius="full" px={3}>
          {isGenerating ? 'Generating' : resultUrl ? 'Complete' : 'Awaiting generation'}
        </Badge>
      </Flex>

      <Grid templateColumns={{ base: '1fr', lg: sourceImage && resultUrl ? '1fr 1fr' : '1fr' }} gap={4}>
        {sourceImage && resultUrl && (
          <Box>
            <Text fontSize="xs" color="text.muted" mb={2} fontWeight="semibold">
              📐 Input Sketch
            </Text>
            <Image
              src={sourceImage}
              alt="Input sketch"
              w="full"
              aspectRatio="1 / 1"
              objectFit="cover"
              borderRadius="18px"
              borderWidth="1px"
              borderColor="border.default"
            />
          </Box>
        )}

        <Box>
          <Text fontSize="xs" color="text.muted" mb={2} fontWeight="semibold">
            🏠 Generated Visualization
          </Text>
          {isGenerating && !resultUrl ? (
            <Skeleton h={{ base: '280px', lg: '100%' }} minH="280px" borderRadius="18px" />
          ) : resultUrl ? (
            <Box position="relative" role="group">
              <Image
                src={resultUrl}
                alt="Generated architectural visualization"
                w="full"
                aspectRatio="1 / 1"
                objectFit="cover"
                borderRadius="18px"
                borderWidth="2px"
                borderColor="brand.500"
              />
              <Button
                size="sm"
                position="absolute"
                right={3}
                top={3}
                leftIcon={<Maximize2 size={15} />}
                onClick={onOpen}
                opacity={{ base: 1, md: 0 }}
                _groupHover={{ opacity: 1 }}
                bg="white"
                color="black"
                _hover={{ bg: 'gray.100' }}
              >
                Fullscreen
              </Button>
            </Box>
          ) : (
            <Flex
              minH="280px"
              borderRadius="18px"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="border.default"
              align="center"
              justify="center"
              direction="column"
              color="text.muted"
              textAlign="center"
              px={6}
              bg="bg.subtle"
            >
              <Text fontWeight="semibold">🎨 Ready to visualize</Text>
              <Text fontSize="sm">Your architectural render will appear here</Text>
            </Flex>
          )}
        </Box>
      </Grid>

      <Flex mt={5} gap={3} wrap="wrap">
        <Button leftIcon={<Download size={16} />} onClick={handleDownload} isDisabled={!resultUrl}>
          Download Result
        </Button>
        <Button leftIcon={<RefreshCcw size={16} />} variant="outline" onClick={onRegenerate} isDisabled={isGenerating}>
          Regenerate
        </Button>
      </Flex>

      <Divider my={5} />

      <Stack spacing={3}>
        <Heading size="sm">📋 Generation Parameters</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
          {metadataRows(metadata, elapsedSeconds).map(([label, value]) => (
            <Flex
              key={label}
              justify="space-between"
              gap={3}
              bg="bg.subtle"
              borderRadius="12px"
              px={3}
              py={2}
            >
              <Text fontSize="xs" color="text.muted" fontWeight="semibold">
                {label}
              </Text>
              <Text fontSize="xs" fontWeight="bold" textAlign="right" textTransform="capitalize">
                {value}
              </Text>
            </Flex>
          ))}
        </SimpleGrid>
      </Stack>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent bg="black" borderRadius="24px" overflow="hidden" maxH="90vh">
          <ModalCloseButton color="white" />
          <ModalBody p={0} maxH="85vh" overflowY="auto">
            {resultUrl && <Image src={resultUrl} alt="Generated output fullscreen" w="full" objectFit="contain" />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SdxlResultViewer;



