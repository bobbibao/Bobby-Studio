import React from 'react';
import { Badge, Box, Flex, Grid, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';

const thesisCards = [
  {
    icon: '📐',
    title: 'Sketch Conditioning',
    body: 'Your hand-drawn or uploaded architectural sketches are automatically preprocessed and cleaned for optimal ControlNet conditioning.',
  },
  {
    icon: '🧠',
    title: 'AI Preprocessing',
    body: 'Background normalization, contrast enhancement, and transparency cleaning happen automatically to ensure clean architectural line work.',
  },
  {
    icon: '🎨',
    title: 'SDXL Foundation',
    body: 'Stable Diffusion XL serves as the powerful base model for high-quality photorealistic architectural visualization generation.',
  },
  {
    icon: '🔗',
    title: 'ControlNet Steering',
    body: 'ControlNet preserves structural integrity by anchoring generation to your sketch, maintaining massing, proportions, and facade rhythm.',
  },
  {
    icon: '🏘️',
    title: 'LoRA Fine-tuning',
    body: 'Custom-trained LoRA adapter injects architectural realism, improving material textures, lighting quality, and design coherence.',
  },
  {
    icon: '✨',
    title: 'Photorealistic Output',
    body: 'Final result combines user intent, structural guidance, and architectural expertise for stunning presentation-ready visualizations.',
  },
];

const generationPipeline = [
  'Sketch upload/draw',
  'Auto-preprocess',
  'ControlNet conditioning',
  'Prompt enhancement',
  'LoRA architectural prior',
  'SDXL generation',
  'Photorealistic output'
];

const ThesisShowcase: React.FC = () => {
  return (
    <Box
      mt={6}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="24px"
      p={{ base: 4, xl: 6 }}
      overflow="hidden"
      position="relative"
    >
      <Box
        position="absolute"
        inset="-30% auto auto 45%"
        w="420px"
        h="420px"
        bg="linear-gradient(135deg, rgba(127,86,217,0.18), rgba(16,185,129,0.12))"
        filter="blur(70px)"
        pointerEvents="none"
      />

      <Stack spacing={6} position="relative">
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
          <Box flex="1">
            <Badge colorScheme="purple" borderRadius="full" mb={3} px={3}>
              🎓 Graduation Thesis Architecture
            </Badge>
            <Heading size="md">Sketch-to-Photorealistic Architecture Generation</Heading>
            <Text color="text.muted" mt={3} maxW="760px">
              A production-grade AI pipeline that transforms architectural sketches into photorealistic visualizations. 
              The system combines ControlNet for structural preservation, custom LoRA training for architectural realism, 
              and SDXL's generative power for stunning design presentations.
            </Text>
          </Box>
        </Flex>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }} gap={3}>
          {thesisCards.map((card) => (
            <Box 
              key={card.title} 
              borderWidth="1px" 
              borderColor="border.default" 
              borderRadius="18px" 
              p={4} 
              bg="bg.subtle"
              _hover={{ borderColor: 'brand.500', boxShadow: '0 8px 24px rgba(127,86,217,0.12)' }}
              transition="all 0.2s"
            >
              <Text fontSize="2xl" mb={2}>{card.icon}</Text>
              <Text fontWeight="bold" fontSize="sm" mb={2}>{card.title}</Text>
              <Text color="text.muted" fontSize="xs" lineHeight="1.5">
                {card.body}
              </Text>
            </Box>
          ))}
        </Grid>

        <Box borderWidth="1px" borderColor="border.default" borderRadius="18px" p={5} bg="bg.subtle">
          <Heading size="sm" mb={4}>🔄 Complete Generation Pipeline</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(auto-fit, minmax(140px, 1fr))' }} gap={3}>
            {generationPipeline.map((step, index) => (
              <Flex key={step} align="center" gap={3} direction={{ base: 'row', md: 'column' }} textAlign={{ base: 'left', md: 'center' }}>
                <Flex
                  w="32px"
                  h="32px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={index === 0 ? 'brand.500' : index === generationPipeline.length - 1 ? 'green.500' : 'zinc.800'}
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  flexShrink={0}
                  _dark={{ bg: index === 0 ? 'brand.400' : index === generationPipeline.length - 1 ? 'green.400' : 'zinc.700' }}
                >
                  {index + 1}
                </Flex>
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color={index === 0 ? 'brand.500' : index === generationPipeline.length - 1 ? 'green.500' : 'text.primary'}>
                    {step}
                  </Text>
                  {index < generationPipeline.length - 1 && (
                    <Text fontSize="lg" color="text.muted" display={{ base: 'inline', md: 'block' }} mx={2}>
                      →
                    </Text>
                  )}
                </Box>
              </Flex>
            ))}
          </Grid>
        </Box>

        <Box borderWidth="1px" borderColor="brand.500" borderRadius="18px" p={4} bg="linear-gradient(135deg, rgba(127,86,217,0.06), rgba(16,185,129,0.06))">
          <Heading size="sm" mb={2}>💡 Key Thesis Contributions</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <Box>
              <Text fontWeight="semibold" fontSize="sm" color="brand.500">✓ Automatic Sketch Preprocessing</Text>
              <Text fontSize="xs" color="text.muted" mt={1}>
                Eliminates manual preprocessing steps while maintaining sketch integrity for ControlNet conditioning
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm" color="green.500">✓ Architectural LoRA Training</Text>
              <Text fontSize="xs" color="text.muted" mt={1}>
                Fine-tuned model specifically for architectural visualization with improved material and lighting accuracy
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm" color="brand.500">✓ Structure-Preserving Generation</Text>
              <Text fontSize="xs" color="text.muted" mt={1}>
                ControlNet integration ensures output maintains user-provided sketch structure and proportions
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm" color="green.500">✓ User-Friendly Interface</Text>
              <Text fontSize="xs" color="text.muted" mt={1}>
                Abstracts complex AI engineering into intuitive controls focused on architectural design intent
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </Stack>
    </Box>
  );
};

export default ThesisShowcase;



