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
  Textarea,
  Input,
  Tag,
  TagLabel,
  Badge,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Copy, Sparkles, Wand2, ArrowRight, Check, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import MorphIcon from '@/components/common/MorphIcon';

interface PromptPreset {
  id: string;
  title: string;
  category: 'photorealism' | 'cinematic' | 'concept' | 'surreal';
  prompt: string;
  negativePrompt?: string;
  styleTags: string[];
}

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'p1',
    title: 'Nordic Forest Pavilion',
    category: 'photorealism',
    prompt: 'Minimalist glass and black timber pavilion nestled in a misty pine forest, floor-to-ceiling panoramic windows, warm ambient illumination spilling onto mossy stones, soft rain puddles with reflections, photorealistic 8k photography, architectural digest feature.',
    styleTags: ['Minimalist', 'Timber', 'Rain Reflection', 'Nordic'],
  },
  {
    id: 'p2',
    title: 'Japandi Sunlight Serenity',
    category: 'photorealism',
    prompt: 'Spacious Japandi style open-concept space, light white oak slat wall, low-profile linen sofa in oatmeal tone, organic travertine coffee table, large fiddle-leaf fig, soft morning sunlight casting geometric window shadows, wabi-sabi serene aesthetics, ultra-detailed render.',
    styleTags: ['Japandi', 'Travertine', 'Morning Sun', 'Oak Slats'],
  },
  {
    id: 'p3',
    title: 'Brutalist Coastal Monolith',
    category: 'concept',
    prompt: 'Dramatic board-formed concrete cantilevered villa protruding over ocean cliffs, rough textured concrete surfaces, deep recessed windows, turbulent ocean waves breaking against rocks below, moody overcast twilight sky with purple atmospheric gradation, raw brutalism.',
    styleTags: ['Brutalist', 'Concrete', 'Ocean Cliff', 'Twilight'],
  },
  {
    id: 'p4',
    title: 'Biophilic Glass Atrium',
    category: 'concept',
    prompt: 'Multi-story modern glass atrium filled with cascading tropical greenery and vertical living walls, curved floating terrazzo staircase, skylight roof casting dappled light, reflecting pool with koi fish, eco-futuristic luxury atmosphere.',
    styleTags: ['Biophilic', 'Terrazzo', 'Living Wall', 'Skylight'],
  },
  {
    id: 'p5',
    title: 'Cyberpunk Skyline Penthouse',
    category: 'cinematic',
    prompt: 'Futuristic high-rise penthouse lounge overlooking a neon-lit cyberpunk metropolis through floor-to-ceiling glass, subtle ambient violet and cyan LED underlighting, smoked glass surfaces, rainy window droplets, cinematic shallow depth of field.',
    styleTags: ['Cyberpunk', 'Neon Reflections', 'Rain Drops', 'Futuristic'],
  },
  {
    id: 'p6',
    title: 'Parametric Desert Retreat',
    category: 'concept',
    prompt: 'Fluid organic parametric rammed earth architecture emerging from desert sand dunes, smooth curved aerodynamic canopy, sunken lounge with central fire pit, warm terracotta and desert sand tones, golden hour low-angle sunlight, high-end resort render.',
    styleTags: ['Parametric', 'Rammed Earth', 'Desert', 'Golden Hour'],
  },
];

const LIGHTING_MODIFIERS = ['Cinematic Dusk', 'Golden Hour', 'Overcast Moody Fog', 'Dappled Sunlight', 'Ambient Blue Hour'];
const MATERIAL_MODIFIERS = ['Board-formed Concrete', 'Charred Shou Sugi Ban Wood', 'Fluted Amber Glass', 'Honed Roman Travertine'];

export const PromptsPage: React.FC = () => {
  const [basePrompt, setBasePrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(14, 16, 25, 0.85)');
  const cardBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');

  const handleMagicExpand = () => {
    if (!basePrompt.trim()) {
      toast.error('Please enter a base idea first (e.g. "concrete villa in forest")');
      return;
    }

    setIsExpanding(true);
    setTimeout(() => {
      const expanded = `${basePrompt.trim()}, designed with floor-to-ceiling low-iron glass, board-formed concrete accents, cinematic dusk illumination, atmospheric mist with warm volumetric cinematic lighting spilling out, photorealistic 8k render, shot on Hasselblad H6D-100c, 35mm lens.`;
      setBasePrompt(expanded);
      setIsExpanding(false);
      toast.success('Prompt successfully expanded with architectural fidelity!');
    }, 400);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseInStudio = (promptText: string) => {
    const params = new URLSearchParams();
    params.set('prompt', promptText);
    navigate(`/generate?${params.toString()}`);
  };

  const filteredPresets = PROMPT_PRESETS.filter((preset) => {
    const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
    const matchesSearch =
      preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.styleTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <Box h="full" w="full" overflowY="auto" px={{ base: 4, md: 8 }} py={6} bg="bg.canvas">
      {/* Magic Prompt Expander Workbench */}
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="24px"
        p={{ base: 6, md: 8 }}
        mb={8}
        bg="linear-gradient(135deg, rgba(127, 86, 217, 0.16) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(6, 182, 212, 0.08) 100%)"
        border="1px solid"
        borderColor="border.subtle"
        boxShadow="0 20px 40px -15px rgba(127, 86, 217, 0.15)"
      >
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
            <MorphIcon type="prompt" size={16} />
            <span>Magic Prompt Studio</span>
          </Box>
          <Badge colorScheme="pink" variant="solid" borderRadius="full" px={2.5}>
            AI Enhancer
          </Badge>
        </HStack>

        <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" letterSpacing="-0.02em" mb={2}>
          Prompt Matrix & Magic Expander
        </Heading>
        <Text color="text.secondary" fontSize={{ base: 'sm', md: 'md' }} mb={6} maxW="700px">
          Turn quick concepts into exhibition-grade architectural prompts with cinematic lighting, camera physics, and material definitions.
        </Text>

        {/* Input box */}
        <Box bg="bg.surface" borderRadius="16px" p={4} border="1px solid" borderColor="border.subtle" mb={4}>
          <Textarea
            placeholder="Type a base idea (e.g. 'japanese tea house with stone pond') and click Magic Expand..."
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            rows={3}
            variant="unstyled"
            fontSize="sm"
            resize="none"
            mb={3}
          />

          {/* Quick Modifier Chips */}
          <Flex wrap="wrap" gap={2} mb={3}>
            <Text fontSize="2xs" color="text.muted" alignSelf="center" fontWeight="bold" textTransform="uppercase">
              Quick Injections:
            </Text>
            {LIGHTING_MODIFIERS.concat(MATERIAL_MODIFIERS).slice(0, 5).map((mod) => (
              <Button
                key={mod}
                size="xs"
                variant="outline"
                borderRadius="full"
                onClick={() => setBasePrompt((prev) => (prev ? `${prev}, ${mod}` : mod))}
                _hover={{ bg: 'brand.500', color: 'white' }}
              >
                + {mod}
              </Button>
            ))}
          </Flex>

          <Flex justify="space-between" align="center" pt={2} borderTop="1px solid" borderColor="border.subtle">
            <Button
              variant="outline"
              size="sm"
              borderRadius="10px"
              onClick={() => setBasePrompt('')}
              isDisabled={!basePrompt}
            >
              Clear
            </Button>

            <HStack spacing={3}>
              <Button
                variant="gradient"
                size="sm"
                borderRadius="10px"
                leftIcon={<Wand2 size={15} />}
                isLoading={isExpanding}
                onClick={handleMagicExpand}
              >
                Magic Expand
              </Button>
              <Button
                colorScheme="purple"
                size="sm"
                borderRadius="10px"
                rightIcon={<ArrowRight size={15} />}
                isDisabled={!basePrompt}
                onClick={() => handleUseInStudio(basePrompt)}
              >
                Open in Studio
              </Button>
            </HStack>
          </Flex>
        </Box>
      </Box>

      {/* Preset Library Section */}
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4} mb={6}>
        <HStack spacing={2} overflowX="auto">
          {['all', 'photorealism', 'cinematic', 'concept', 'surreal'].map((cat) => (
            <Button
              key={cat}
              size="sm"
              borderRadius="full"
              variant={selectedCategory === cat ? 'solid' : 'ghost'}
              colorScheme={selectedCategory === cat ? 'purple' : 'gray'}
              onClick={() => setSelectedCategory(cat)}
              textTransform="capitalize"
              px={4}
            >
              {cat}
            </Button>
          ))}
        </HStack>

        <Input
          maxW={{ base: 'full', md: '280px' }}
          placeholder="Filter prompts..."
          borderRadius="12px"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          bg="bg.surface"
          size="sm"
        />
      </Flex>

      {/* Grid of Presets */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
        {filteredPresets.map((preset) => (
          <Box
            key={preset.id}
            bg={cardBg}
            border="1px solid"
            borderColor={cardBorder}
            borderRadius="20px"
            p={5}
            display="flex"
            flexDirection="column"
            transition="all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            _hover={{
              borderColor: 'rgba(127, 86, 217, 0.4)',
              transform: 'translateY(-2px)',
              boxShadow: '0 15px 35px -10px rgba(127, 86, 217, 0.15)',
            }}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <Heading as="h3" fontSize="sm" fontWeight="bold">
                {preset.title}
              </Heading>
              <Badge variant="subtle" colorScheme="purple" borderRadius="full" px={2} textTransform="capitalize">
                {preset.category}
              </Badge>
            </Flex>

            <Text fontSize="xs" color="text.secondary" mb={4} flex="1" lineHeight="1.6" noOfLines={4}>
              "{preset.prompt}"
            </Text>

            <Flex wrap="wrap" gap={1.5} mb={4}>
              {preset.styleTags.map((tag) => (
                <Tag key={tag} size="sm" borderRadius="full" variant="subtle" colorScheme="gray">
                  <TagLabel fontSize="2xs">{tag}</TagLabel>
                </Tag>
              ))}
            </Flex>

            <Flex justify="space-between" align="center" pt={3} borderTop="1px solid" borderColor="border.subtle">
              <IconButton
                aria-label="Copy prompt"
                size="sm"
                variant="ghost"
                borderRadius="8px"
                icon={copiedId === preset.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                onClick={() => handleCopy(preset.id, preset.prompt)}
              />

              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                borderRadius="8px"
                rightIcon={<ArrowRight size={13} />}
                onClick={() => handleUseInStudio(preset.prompt)}
              >
                Use in Studio
              </Button>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default PromptsPage;
