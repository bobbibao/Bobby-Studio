import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Button,
  HStack,
  VStack,
  Tag,
  TagLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Tabs,
  TabList,
  Tab,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Search, Sparkles, Zap, Layers, Cpu, Compass, ArrowRight, CheckCircle2, Sliders } from 'lucide-react';
import MorphIcon from '@/components/common/MorphIcon';

interface AIModel {
  id: string;
  name: string;
  version: string;
  category: 'photorealism' | 'realtime' | 'architecture' | 'concept';
  latency: string;
  resolution: string;
  description: string;
  bestFor: string[];
  recommendedPrompt: string;
  isPopular?: boolean;
  isNew?: boolean;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'bobby-ultra-2',
    name: 'Bobby Ultra Photorealism',
    version: 'v2.2 Pro',
    category: 'photorealism',
    latency: '1.2s',
    resolution: '4096 × 4096 px',
    description: 'Flagship synthesis engine for ultra-photorealistic creative renders, physical lighting, and tactile PBR materiality.',
    bestFor: ['Photorealistic Scenes', 'Cinematic Composition', 'Fine Art Concepts', 'Raytraced Glass & Materials'],
    recommendedPrompt: 'Modern minimalist pavilion with cedar slats, floor-to-ceiling glass, cinematic dusk light, rain wet reflection',
    isPopular: true,
  },
  {
    id: 'bobby-turbo-draft',
    name: 'Bobby Turbo Realtime',
    version: 'v1.8 Lightning',
    category: 'realtime',
    latency: '280ms',
    resolution: '1024 × 1024 px',
    description: 'Sub-second interactive drafting engine engineered for seamless realtime canvas sketching and rapid visual ideation.',
    bestFor: ['Realtime Sketching', 'Rapid Ideation', 'Layout Brainstorming', 'Color Blocking'],
    recommendedPrompt: 'Volumetric massing concept for a coastal villa, cliffside cantilever, twilight ambient glow',
    isNew: true,
  },
  {
    id: 'bobby-concept-architect',
    name: 'Bobby Concept Architect',
    version: 'v2.0 Beta',
    category: 'architecture',
    latency: '850ms',
    resolution: '2048 × 2048 px',
    description: 'Specialized parametric and structural model calibrated for volumetric diagrams, massing studies, and urban facades.',
    bestFor: ['Parametric Facades', 'Urban Masterplans', 'Cantilever Structures', 'Isometric Diagrams'],
    recommendedPrompt: 'Brutalist concrete museum on a rocky coastline, deep shadowed apertures, dramatic overcast sky',
  },
  {
    id: 'bobby-pbr-materials',
    name: 'Bobby Material & Lighting Lab',
    version: 'v1.5',
    category: 'photorealism',
    latency: '1.4s',
    resolution: '3072 × 3072 px',
    description: 'Calibrated specifically for micro-surface textures, brushed metals, fluted glass, raw travertine, and atmospheric fog.',
    bestFor: ['Material Samples', 'Close-up Textures', 'Product Vignettes', 'Atmospheric Lighting'],
    recommendedPrompt: 'Close up architectural detail of fluted amber glass with brushed titanium hardware, soft dappled sunlight',
  },
  {
    id: 'bobby-biophilic-nature',
    name: 'Bobby Biophilic Landscapes',
    version: 'v2.1',
    category: 'concept',
    latency: '1.1s',
    resolution: '2048 × 2048 px',
    description: 'Generates lush botanical courtyards, green roofs, vertical gardens, and seamless integration between indoor and outdoor living.',
    bestFor: ['Zen Courtyards', 'Living Green Walls', 'Desert Oases', 'Tropical Atriums'],
    recommendedPrompt: 'Sunlit Japanese zen courtyard garden with bonsai moss garden, dark charred wood engawa deck, soft water fountain',
  },
];

export const ModelsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const navigate = useNavigate();

  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(14, 16, 25, 0.85)');
  const cardBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const cardHoverBorder = useColorModeValue('rgba(127, 86, 217, 0.4)', 'rgba(168, 85, 247, 0.5)');

  const filteredModels = AI_MODELS.filter((model) => {
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.bestFor.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLaunchModel = (model: AIModel) => {
    const params = new URLSearchParams();
    params.set('prompt', model.recommendedPrompt);
    navigate(`/generate?${params.toString()}`);
  };

  return (
    <Box h="full" w="full" overflowY="auto" px={{ base: 4, md: 8 }} py={6} bg="bg.canvas">
      {/* Header Banner */}
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="24px"
        p={{ base: 6, md: 8 }}
        mb={8}
        bg="linear-gradient(135deg, rgba(127, 86, 217, 0.18) 0%, rgba(6, 182, 212, 0.12) 50%, rgba(15, 23, 42, 0.05) 100%)"
        border="1px solid"
        borderColor="border.subtle"
        boxShadow="0 20px 40px -15px rgba(127, 86, 217, 0.15)"
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
                bg="rgba(127, 86, 217, 0.2)"
                color="brand.300"
                display="inline-flex"
                alignItems="center"
                gap={1.5}
              >
                <MorphIcon type="model" size={16} />
                <span>Engine Registry</span>
              </Box>
              <Badge colorScheme="cyan" variant="solid" borderRadius="full" px={2.5}>
                5 Active Checkpoints
              </Badge>
            </HStack>

            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" letterSpacing="-0.02em" mb={2}>
              AI Models & Generative Engines
            </Heading>
            <Text color="text.secondary" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.6">
              Explore specialized neural architectures calibrated for physical realism, real-time draft rendering, and architectural synthesis.
            </Text>
          </Box>

          <Button
            as={RouterLink}
            to="/generate"
            variant="gradient"
            size="lg"
            h="48px"
            px={6}
            borderRadius="14px"
            leftIcon={<Sparkles size={18} />}
          >
            Launch Creative Studio
          </Button>
        </Flex>
      </Box>

      {/* Filter and Search Controls */}
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4} mb={6}>
        <HStack spacing={2} overflowX="auto" pb={{ base: 2, md: 0 }}>
          {['all', 'photorealism', 'realtime', 'architecture', 'concept'].map((category) => (
            <Button
              key={category}
              size="sm"
              borderRadius="full"
              variant={selectedCategory === category ? 'solid' : 'ghost'}
              colorScheme={selectedCategory === category ? 'purple' : 'gray'}
              onClick={() => setSelectedCategory(category)}
              textTransform="capitalize"
              px={4}
            >
              {category}
            </Button>
          ))}
        </HStack>

        <InputGroup maxW={{ base: 'full', md: '320px' }}>
          <InputLeftElement pointerEvents="none">
            <Search size={16} className="text-gray-400" />
          </InputLeftElement>
          <Input
            placeholder="Search engines, tags, styles..."
            borderRadius="12px"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="bg.surface"
          />
        </InputGroup>
      </Flex>

      {/* Model Cards Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
        {filteredModels.map((model) => (
          <Box
            key={model.id}
            bg={cardBg}
            border="1px solid"
            borderColor={cardBorder}
            borderRadius="20px"
            p={6}
            display="flex"
            flexDirection="column"
            position="relative"
            transition="all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            _hover={{
              borderColor: cardHoverBorder,
              transform: 'translateY(-3px)',
              boxShadow: '0 20px 40px -15px rgba(127, 86, 217, 0.2)',
            }}
          >
            {/* Top Badges */}
            <Flex justify="space-between" align="center" mb={4}>
              <HStack spacing={2}>
                <MorphIcon type="model" size={22} />
                <Heading as="h3" fontSize="md" fontWeight="bold">
                  {model.name}
                </Heading>
              </HStack>
              {model.isPopular ? (
                <Badge colorScheme="purple" borderRadius="full" px={2.5} py={0.5}>
                  Popular
                </Badge>
              ) : model.isNew ? (
                <Badge colorScheme="cyan" borderRadius="full" px={2.5} py={0.5}>
                  New
                </Badge>
              ) : (
                <Badge variant="outline" borderRadius="full" px={2}>
                  {model.version}
                </Badge>
              )}
            </Flex>

            {/* Description */}
            <Text color="text.secondary" fontSize="sm" mb={4} flex="1">
              {model.description}
            </Text>

            {/* Benchmark Stats */}
            <HStack spacing={4} p={3} borderRadius="12px" bg="bg.subtle" mb={4}>
              <VStack align="flex-start" spacing={0} flex="1">
                <Text fontSize="2xs" color="text.muted" textTransform="uppercase" fontWeight="bold">
                  Latency
                </Text>
                <HStack spacing={1}>
                  <Zap size={13} className="text-amber-400" />
                  <Text fontSize="sm" fontWeight="bold">
                    {model.latency}
                  </Text>
                </HStack>
              </VStack>

              <VStack align="flex-start" spacing={0} flex="1">
                <Text fontSize="2xs" color="text.muted" textTransform="uppercase" fontWeight="bold">
                  Max Output
                </Text>
                <HStack spacing={1}>
                  <Layers size={13} className="text-cyan-400" />
                  <Text fontSize="sm" fontWeight="bold">
                    {model.resolution}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {/* Tags */}
            <Flex wrap="wrap" gap={1.5} mb={5}>
              {model.bestFor.map((tag) => (
                <Tag key={tag} size="sm" borderRadius="full" variant="subtle" colorScheme="gray">
                  <TagLabel fontSize="2xs">{tag}</TagLabel>
                </Tag>
              ))}
            </Flex>

            {/* Launch Button */}
            <Button
              variant="outline"
              colorScheme="purple"
              size="md"
              borderRadius="12px"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => handleLaunchModel(model)}
              _hover={{ bg: 'brand.500', color: 'white', borderColor: 'brand.500' }}
            >
              Use in Studio
            </Button>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default ModelsPage;
