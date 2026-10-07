import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Button,
  HStack,
  VStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Select,
  Input,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Sliders, Sparkles, ArrowRight, RefreshCw, Layers, Compass, Play } from 'lucide-react';
import MorphIcon from '@/components/common/MorphIcon';

export const LabPage: React.FC = () => {
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState('4289104');
  const [testPrompt, setTestPrompt] = useState('Minimalist glass architectural pavilion with rain reflections');
  const navigate = useNavigate();

  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(14, 16, 25, 0.85)');
  const cardBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');

  const handleLaunchExperiment = () => {
    const params = new URLSearchParams();
    params.set('prompt', testPrompt);
    params.set('aspectRatio', aspectRatio);
    navigate(`/generate?${params.toString()}`);
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(1000000 + Math.random() * 9000000).toString());
  };

  return (
    <Box h="full" w="full" overflowY="auto" px={{ base: 4, md: 8 }} py={6} bg="bg.canvas">
      {/* Hero Header */}
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="24px"
        p={{ base: 6, md: 8 }}
        mb={8}
        bg="linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(127, 86, 217, 0.15) 50%, rgba(6, 182, 212, 0.08) 100%)"
        border="1px solid"
        borderColor="border.subtle"
        boxShadow="0 20px 40px -15px rgba(236, 72, 153, 0.15)"
      >
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', md: 'center' }}
          gap={6}
          position="relative"
          zIndex={1}
        >
          <Box maxW="680px">
            <HStack spacing={2} mb={3}>
              <Box
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="semibold"
                bg="rgba(236, 72, 153, 0.2)"
                color="pink.300"
                display="inline-flex"
                alignItems="center"
                gap={1.5}
              >
                <MorphIcon type="lab" size={16} />
                <span>Creative Experimentation Lab</span>
              </Box>
              <Badge colorScheme="purple" variant="solid" borderRadius="full" px={2.5}>
                Parameter Workbench
              </Badge>
            </HStack>

            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" letterSpacing="-0.02em" mb={2}>
              Generation Lab & Parameter Matrix
            </Heading>
            <Text color="text.secondary" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.6">
              Benchmark prompt variations, calibrate aspect ratios, test guidance scales, and reproduce deterministic seeds.
            </Text>
          </Box>

          <Button
            variant="gradient"
            size="lg"
            h="48px"
            px={6}
            borderRadius="14px"
            leftIcon={<Play size={18} />}
            onClick={handleLaunchExperiment}
          >
            Run in Studio
          </Button>
        </Flex>
      </Box>

      {/* Workbench Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Controls Card */}
        <Box bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="20px" p={6}>
          <Heading as="h2" fontSize="md" fontWeight="bold" mb={4} display="flex" alignItems="center" gap={2}>
            <Sliders size={18} className="text-purple-400" />
            Parameter Calibration
          </Heading>

          <VStack spacing={5} align="stretch">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase" mb={2}>
                Test Prompt
              </Text>
              <Input
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                borderRadius="12px"
                bg="bg.surface"
                size="sm"
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase" mb={2}>
                Aspect Ratio
              </Text>
              <Select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                borderRadius="12px"
                bg="bg.surface"
                size="sm"
              >
                <option value="1:1">1:1 Square (1024 × 1024)</option>
                <option value="16:9">16:9 Cinematic Landscape (1344 × 768)</option>
                <option value="9:16">9:16 Portrait Mobile (768 × 1344)</option>
                <option value="4:3">4:3 Architectural Standard (1152 × 864)</option>
                <option value="21:9">21:9 Ultra-Wide Panoramic (1536 × 640)</option>
              </Select>
            </Box>

            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase">
                  Guidance Scale (CFG)
                </Text>
                <Text fontSize="xs" fontWeight="bold">
                  {guidanceScale.toFixed(1)}
                </Text>
              </Flex>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={guidanceScale}
                onChange={(v) => setGuidanceScale(v)}
                colorScheme="purple"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="2xs" color="text.muted" mt={1}>
                Higher values adhere strictly to the prompt; lower values increase creative hallucinations.
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="uppercase" mb={2}>
                Deterministic Seed
              </Text>
              <HStack>
                <Input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  borderRadius="12px"
                  bg="bg.surface"
                  size="sm"
                />
                <Button size="sm" variant="outline" borderRadius="10px" leftIcon={<RefreshCw size={14} />} onClick={handleRandomSeed}>
                  Randomize
                </Button>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* Experiment Preview Card */}
        <Box bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="20px" p={6} display="flex" flexDirection="column">
          <Heading as="h2" fontSize="md" fontWeight="bold" mb={4} display="flex" alignItems="center" gap={2}>
            <Layers size={18} className="text-cyan-400" />
            Configured Output Spec
          </Heading>

          <Box
            flex="1"
            borderRadius="16px"
            bg="bg.subtle"
            border="1px dashed"
            borderColor="border.subtle"
            p={6}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
          >
            <Box
              w="140px"
              h={aspectRatio === '16:9' ? '80px' : aspectRatio === '9:16' ? '180px' : aspectRatio === '21:9' ? '60px' : '140px'}
              borderRadius="12px"
              border="2px solid"
              borderColor="brand.400"
              bg="rgba(127, 86, 217, 0.1)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={4}
              transition="all 0.3s ease"
            >
              <Text fontSize="xs" fontWeight="bold" color="brand.300">
                {aspectRatio}
              </Text>
            </Box>

            <Heading as="h3" fontSize="sm" fontWeight="semibold" mb={1}>
              Ready for Interactive Synthesis
            </Heading>
            <Text fontSize="xs" color="text.secondary" maxW="360px" mb={4}>
              Clicking below will transfer this exact configuration into Bobby Studio for immediate generation.
            </Text>

            <Button
              colorScheme="purple"
              size="md"
              borderRadius="12px"
              rightIcon={<ArrowRight size={16} />}
              onClick={handleLaunchExperiment}
            >
              Transfer & Launch Studio
            </Button>
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default LabPage;
