import { useState, useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import SignUp from '@/features/auth/pages/auth/SignUp';
import SignIn from '@/features/auth/pages/auth/SignIn';
import {
  useColorMode,
  Text,
  Flex,
  Box,
  Image,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '@/constants';
import {
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoBobbyFull } from '@/shared/logo';

import welcomeArtwork from '@/assets/img/auth/bobby-studio-courtyard.webp';
import bg1 from '@/assets/img/auth/background/bg-1.webp';
import bg3 from '@/assets/img/auth/background/bg-3.webp';
import bg5 from '@/assets/img/auth/background/bg-5.webp';

interface Exhibit {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  image: string;
  prompt: string;
  specs: {
    engine: string;
    sampler: string;
    steps: number;
    cfg: number;
    latency: string;
  };
}

const EXHIBITS: Exhibit[] = [
  {
    id: 'biophilic',
    tag: '01',
    title: 'Biophilic Sanctuary',
    subtitle: 'Misty Bamboo Grove • Organic Architecture',
    image: welcomeArtwork,
    prompt:
      'Futuristic cantilevered glass sanctuary submerged in misty bamboo grove, raw concrete & cedar timber, volumetric god rays, 8K octane architectural photography.',
    specs: {
      engine: 'Gen-3 Alpha',
      sampler: 'DPM++ 2M Karras',
      steps: 32,
      cfg: 7.5,
      latency: '1.2s',
    },
  },
  {
    id: 'parametric',
    tag: '02',
    title: 'Sky Pavilion',
    subtitle: 'Bioluminescent Twilight • Parametric Curves',
    image: bg1,
    prompt:
      'Hyper-modern parametric curved museum over reflecting water pool, bioluminescent dusk illumination, photorealistic raytraced render, architectural digest.',
    specs: {
      engine: 'Gen-3 Alpha',
      sampler: 'Euler Ancestral',
      steps: 28,
      cfg: 7.0,
      latency: '0.9s',
    },
  },
  {
    id: 'horizon',
    tag: '03',
    title: 'Horizon Studio',
    subtitle: 'Minimalist Brutalism • Coastal Sunrise',
    image: bg3,
    prompt:
      'Brutalist seaside creative workspace with floor-to-ceiling glass, sunset golden hour glow, textured limestone, ultra-detailed architectural lighting.',
    specs: {
      engine: 'Gen-3 Alpha',
      sampler: 'DDIM Diffusion',
      steps: 35,
      cfg: 8.0,
      latency: '1.4s',
    },
  },
  {
    id: 'atrium',
    tag: '04',
    title: 'Urban Atrium',
    subtitle: 'Vertical Garden • Neo-Futuristic Oasis',
    image: bg5,
    prompt:
      'Neo-futuristic green atrium with floating glass bridges, indoor cascading waterfall, natural daylight diffusion, high-fidelity architectural visualization.',
    specs: {
      engine: 'Gen-3 Alpha',
      sampler: 'DPM++ SDE',
      steps: 30,
      cfg: 7.2,
      latency: '1.1s',
    },
  },
];

export default function Auth() {
  const { i18n } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const isVietnamese = i18n.resolvedLanguage?.startsWith('vi');
  const language =
    languageOptions.find(option => option.value === i18n.resolvedLanguage?.split('-')[0]) ??
    languageOptions[0];

  const [activeExhibitIndex, setActiveExhibitIndex] = useState(0);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isHoveringShowcase, setIsHoveringShowcase] = useState(false);

  const activeExhibit = EXHIBITS[activeExhibitIndex];

  // Auto-advance showcase exhibition every 9 seconds when not hovered
  useEffect(() => {
    if (isHoveringShowcase) return;
    const interval = setInterval(() => {
      setActiveExhibitIndex(prev => (prev + 1) % EXHIBITS.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [isHoveringShowcase]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activeExhibit.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
    }
  };

  const bgColor = useColorModeValue('zinc.50', 'zinc.950');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.86)', 'rgba(15, 17, 26, 0.82)');
  const cardBorder = useColorModeValue('rgba(127, 86, 217, 0.16)', 'rgba(255, 255, 255, 0.1)');
  const cardShadow = useColorModeValue(
    '0 25px 60px -15px rgba(127, 86, 217, 0.18), 0 0 1px rgba(0,0,0,0.06)',
    '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(127, 86, 217, 0.15)'
  );

  return (
    <Box
      position="relative"
      minH="100dvh"
      w="full"
      bg={bgColor}
      overflowX="hidden"
      className="aurora-bg"
    >
      {/* 1. Cyber Ambient Atmosphere & Glow Orbs */}
      <Box
        position="absolute"
        top="-10%"
        left="5%"
        w={{ base: '320px', md: '560px' }}
        h={{ base: '320px', md: '560px' }}
        rounded="full"
        bg="radial-gradient(circle, rgba(127, 86, 217, 0.22) 0%, transparent 70%)"
        filter="blur(70px)"
        pointerEvents="none"
        zIndex={0}
      />
      <Box
        position="absolute"
        bottom="-8%"
        left={{ base: '10%', lg: '30%' }}
        w={{ base: '280px', md: '480px' }}
        h={{ base: '280px', md: '480px' }}
        rounded="full"
        bg="radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, transparent 70%)"
        filter="blur(80px)"
        pointerEvents="none"
        zIndex={0}
      />
      {/* Subtle Cyber Dot Matrix */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={0}
        opacity={useColorModeValue(0.4, 0.25)}
        sx={{
          backgroundImage:
            'radial-gradient(rgba(127, 86, 217, 0.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%)',
        }}
      />

      {/* Main Layout Grid */}
      <Flex minH="100dvh" w="full" position="relative" zIndex={1}>
        {/* ========================================================= */}
        {/* LEFT DECK: Header, Auth Gateway Card, Telemetry, Footer   */}
        {/* ========================================================= */}
        <Flex
          direction="column"
          w={{ base: 'full', lg: '48%', xl: '44%' }}
          minW={0}
          px={{ base: 5, sm: 8, md: 12 }}
          py={{ base: 6, md: 8 }}
          justify="space-between"
        >
          {/* Top Header Deck */}
          <Flex as="header" justify="space-between" align="center" gap={4}>
            {/* Logo + Neural Cluster Status */}
            <Flex align="center" gap={3}>
              <Link to="/" aria-label="Bobby Studio home">
                <LogoBobbyFull />
              </Link>
              <Flex
                display={{ base: 'none', sm: 'flex' }}
                align="center"
                gap={2}
                px={2.5}
                py={1}
                rounded="full"
                bg={useColorModeValue(
                  'rgba(16, 185, 129, 0.08)',
                  'rgba(16, 185, 129, 0.15)'
                )}
                border="1px solid"
                borderColor={useColorModeValue(
                  'rgba(16, 185, 129, 0.25)',
                  'rgba(16, 185, 129, 0.3)'
                )}
              >
                <Box
                  w="6px"
                  h="6px"
                  rounded="full"
                  bg="emerald.400"
                  boxShadow="0 0 8px #10B981"
                />
                <Text
                  fontSize="2xs"
                  fontWeight="700"
                  color="emerald.500"
                  letterSpacing="0.04em"
                  textTransform="uppercase"
                >
                  {isVietnamese ? 'Hệ thống Studio • Sẵn sàng' : 'Neural Core v2.4 • Active'}
                </Text>
              </Flex>
            </Flex>

            {/* Header Right Actions: Language & Dark Mode */}
            <Flex align="center" gap={2}>
              {/* Language Switcher */}
              <Menu>
                <MenuButton
                  as={Button}
                  variant="ghost"
                  size="sm"
                  h="36px"
                  px={3}
                  borderRadius="12px"
                  bg={useColorModeValue('rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)')}
                  border="1px solid"
                  borderColor={useColorModeValue(
                    'rgba(0,0,0,0.06)',
                    'rgba(255,255,255,0.08)'
                  )}
                  leftIcon={<Globe size={14} />}
                  rightIcon={<ChevronDown size={14} />}
                  _hover={{
                    bg: useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.1)'),
                  }}
                  fontSize="xs"
                  fontWeight="600"
                >
                  {language.label}
                </MenuButton>
                <MenuList
                  bg={useColorModeValue('rgba(255,255,255,0.95)', 'rgba(20,22,33,0.95)')}
                  backdropFilter="blur(20px)"
                  borderColor={useColorModeValue(
                    'rgba(0,0,0,0.08)',
                    'rgba(255,255,255,0.1)'
                  )}
                  borderRadius="16px"
                  boxShadow="xl"
                  minW="140px"
                  p={1.5}
                >
                  {languageOptions.map(option => (
                    <MenuItem
                      key={option.value}
                      onClick={() => void i18n.changeLanguage(option.value)}
                      bg={language.value === option.value ? 'bg.subtle' : 'transparent'}
                      color="text.primary"
                      _hover={{ bg: 'bg.subtle' }}
                      borderRadius="10px"
                      fontSize="xs"
                      fontWeight={language.value === option.value ? '700' : '500'}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>

              {/* Theme Toggle Button */}
              <Tooltip
                label={
                  colorMode === 'dark'
                    ? isVietnamese
                      ? 'Chuyển sang Giao diện Sáng'
                      : 'Switch to Light Mode'
                    : isVietnamese
                    ? 'Chuyển sang Giao diện Tối'
                    : 'Switch to Dark Mode'
                }
                hasArrow
                borderRadius="md"
                fontSize="2xs"
              >
                <IconButton
                  aria-label="Toggle theme"
                  variant="ghost"
                  size="sm"
                  h="36px"
                  w="36px"
                  borderRadius="12px"
                  bg={useColorModeValue('rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)')}
                  border="1px solid"
                  borderColor={useColorModeValue(
                    'rgba(0,0,0,0.06)',
                    'rgba(255,255,255,0.08)'
                  )}
                  icon={colorMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  onClick={toggleColorMode}
                  _hover={{
                    bg: useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.1)'),
                    transform: 'scale(1.05)',
                  }}
                  transition="all 0.2s"
                />
              </Tooltip>
            </Flex>
          </Flex>

          {/* Form Deck Center */}
          <Flex
            as="main"
            direction="column"
            justify="center"
            align="center"
            minW={0}
            py={{ base: 8, md: 10 }}
            w="full"
          >
            <Box
              w="full"
              maxW="450px"
              position="relative"
              p={{ base: 6, sm: 8 }}
              borderRadius="28px"
              bg={cardBg}
              backdropFilter="blur(26px)"
              sx={{ WebkitBackdropFilter: 'blur(26px)' }}
              border="1px solid"
              borderColor={cardBorder}
              boxShadow={cardShadow}
              transition="all 0.3s ease"
            >
              {/* Specular Rim Light on top border */}
              <Box
                position="absolute"
                top={0}
                left="12%"
                right="12%"
                h="1px"
                bg="linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
                pointerEvents="none"
              />

              <Routes>
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/sign-in" element={<SignIn />} />
              </Routes>
            </Box>

            {/* Studio Security & Trust Telemetry Chips */}
            <Flex
              mt={5}
              wrap="wrap"
              justify="center"
              align="center"
              gap={3}
              color="text.muted"
              fontSize="2xs"
            >
              <Flex align="center" gap={1.5}>
                <ShieldCheck size={13} />
                <Text fontWeight="600">256-Bit SSL Encrypted</Text>
              </Flex>
              <Text opacity={0.3}>•</Text>
              <Flex align="center" gap={1.5}>
                <Zap size={13} />
                <Text fontWeight="600">Zero-Latency Canvas</Text>
              </Flex>
              <Text opacity={0.3}>•</Text>
              <Flex align="center" gap={1.5}>
                <Layers size={13} />
                <Text fontWeight="600">Multi-Model Orchestration</Text>
              </Flex>
            </Flex>
          </Flex>

          {/* Footer Deck */}
          <Flex
            as="footer"
            justify="space-between"
            align="center"
            wrap="wrap"
            gap={2}
            pt={2}
            borderTop="1px solid"
            borderColor={useColorModeValue(
              'rgba(0,0,0,0.04)',
              'rgba(255,255,255,0.05)'
            )}
          >
            <Text fontSize="2xs" color="text.muted">
              © {new Date().getFullYear()} Bobby Studio AI Inc.
            </Text>
            <Flex align="center" gap={2}>
              <Box w="5px" h="5px" rounded="full" bg="emerald.400" />
              <Text fontSize="2xs" color="text.muted" fontWeight="600">
                v2.4.0 (Production Core)
              </Text>
            </Flex>
          </Flex>
        </Flex>

        {/* ========================================================= */}
        {/* RIGHT DECK: Futuristic Generative Showcase Stage         */}
        {/* ========================================================= */}
        <Box
          display={{ base: 'none', lg: 'block' }}
          w={{ base: '0%', lg: '52%', xl: '56%' }}
          position="sticky"
          top={0}
          h="100dvh"
          p={4}
          aria-hidden="true"
        >
          <Box
            position="relative"
            w="full"
            h="full"
            borderRadius="30px"
            overflow="hidden"
            border="1px solid"
            borderColor={useColorModeValue(
              'rgba(127, 86, 217, 0.2)',
              'rgba(255, 255, 255, 0.12)'
            )}
            boxShadow="0 30px 80px -20px rgba(0, 0, 0, 0.7)"
            onMouseEnter={() => setIsHoveringShowcase(true)}
            onMouseLeave={() => setIsHoveringShowcase(false)}
          >
            {/* Animated Exhibition Slide with Crossfade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeExhibit.id}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <Image
                  src={activeExhibit.image}
                  alt={activeExhibit.title}
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Dark Cinematic Vignette & Ambient Gradient */}
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(180deg, rgba(8, 9, 14, 0.45) 0%, rgba(8, 9, 14, 0.2) 40%, rgba(8, 9, 14, 0.88) 100%)"
              pointerEvents="none"
            />

            {/* Top HUD: Studio Engine Telemetry & Cluster Tag */}
            <Flex
              position="absolute"
              top={6}
              left={6}
              right={6}
              justify="space-between"
              align="center"
              zIndex={10}
            >
              {/* Studio Engine Badge */}
              <Flex
                align="center"
                gap={2.5}
                px={3.5}
                py={1.5}
                borderRadius="full"
                bg="rgba(10, 12, 20, 0.75)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(255, 255, 255, 0.15)"
                boxShadow="0 8px 24px rgba(0, 0, 0, 0.4)"
              >
                <Box
                  p={1}
                  borderRadius="full"
                  bg="linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)"
                >
                  <Sparkles size={12} color="white" />
                </Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="white"
                  letterSpacing="0.04em"
                >
                  BOBBY STUDIO AI
                </Text>
                <Box w="3px" h="3px" rounded="full" bg="whiteAlpha.400" />
                <Text fontSize="2xs" color="emerald.400" fontWeight="700">
                  DIFFUSION ACTIVE
                </Text>
              </Flex>

              {/* Exhibit Switcher Tabs */}
              <Flex
                align="center"
                gap={1.5}
                p={1}
                borderRadius="full"
                bg="rgba(10, 12, 20, 0.75)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(255, 255, 255, 0.15)"
                boxShadow="0 8px 24px rgba(0, 0, 0, 0.4)"
              >
                {EXHIBITS.map((exhibit, idx) => (
                  <Button
                    key={exhibit.id}
                    size="xs"
                    h="26px"
                    px={2.5}
                    borderRadius="full"
                    variant="ghost"
                    fontSize="2xs"
                    fontWeight="700"
                    color={activeExhibitIndex === idx ? 'white' : 'whiteAlpha.600'}
                    bg={
                      activeExhibitIndex === idx
                        ? 'linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)'
                        : 'transparent'
                    }
                    _hover={{
                      color: 'white',
                      bg:
                        activeExhibitIndex === idx
                          ? 'linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)'
                          : 'whiteAlpha.200',
                    }}
                    onClick={() => setActiveExhibitIndex(idx)}
                  >
                    {exhibit.tag} {exhibit.title.split(' ')[0]}
                  </Button>
                ))}
              </Flex>
            </Flex>

            {/* Bottom HUD: Live Prompt Capsule & Generative Console */}
            <Box
              position="absolute"
              bottom={6}
              left={6}
              right={6}
              p={6}
              borderRadius="24px"
              bg="rgba(10, 12, 22, 0.78)"
              backdropFilter="blur(28px)"
              sx={{ WebkitBackdropFilter: 'blur(28px)' }}
              border="1px solid rgba(255, 255, 255, 0.15)"
              boxShadow="0 25px 60px rgba(0, 0, 0, 0.65)"
              zIndex={10}
            >
              {/* Exhibit Header & Active Parameters */}
              <Flex justify="space-between" align="center" mb={2.5} wrap="wrap" gap={2}>
                <Flex align="center" gap={2}>
                  <Box
                    px={2}
                    py={0.5}
                    rounded="md"
                    bg="rgba(139, 92, 246, 0.25)"
                    border="1px solid rgba(168, 85, 247, 0.4)"
                    fontSize="3xs"
                    fontWeight="800"
                    color="brand.200"
                    letterSpacing="0.05em"
                  >
                    EXHIBIT {activeExhibit.tag}
                  </Box>
                  <Text fontSize="sm" fontWeight="700" color="white">
                    {activeExhibit.title}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    — {activeExhibit.subtitle}
                  </Text>
                </Flex>

                {/* Telemetry specs badges */}
                <Flex align="center" gap={1.5}>
                  <Box
                    px={2}
                    py={0.5}
                    rounded="full"
                    bg="whiteAlpha.100"
                    border="1px solid whiteAlpha.200"
                    fontSize="3xs"
                    fontWeight="600"
                    color="whiteAlpha.800"
                  >
                    ⚡ {activeExhibit.specs.latency} Latency
                  </Box>
                  <Box
                    px={2}
                    py={0.5}
                    rounded="full"
                    bg="whiteAlpha.100"
                    border="1px solid whiteAlpha.200"
                    fontSize="3xs"
                    fontWeight="600"
                    color="whiteAlpha.800"
                  >
                    ✦ {activeExhibit.specs.sampler}
                  </Box>
                </Flex>
              </Flex>

              {/* Generative Prompt Capsule */}
              <Box
                position="relative"
                p={3}
                mb={3.5}
                borderRadius="14px"
                bg="rgba(0, 0, 0, 0.4)"
                border="1px solid rgba(255, 255, 255, 0.08)"
              >
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Text
                    fontSize="xs"
                    color="whiteAlpha.900"
                    fontStyle="italic"
                    lineHeight="1.5"
                    noOfLines={2}
                  >
                    &ldquo;{activeExhibit.prompt}&rdquo;
                  </Text>
                  <Tooltip
                    label={copiedPrompt ? 'Copied to clipboard!' : 'Copy prompt'}
                    hasArrow
                    fontSize="2xs"
                  >
                    <IconButton
                      aria-label="Copy prompt"
                      size="xs"
                      h="28px"
                      w="28px"
                      minW="28px"
                      borderRadius="8px"
                      variant="ghost"
                      color="whiteAlpha.800"
                      bg="whiteAlpha.100"
                      _hover={{ bg: 'whiteAlpha.300', color: 'white' }}
                      icon={
                        copiedPrompt ? (
                          <Check size={13} color="#10B981" />
                        ) : (
                          <Copy size={13} />
                        )
                      }
                      onClick={handleCopyPrompt}
                    />
                  </Tooltip>
                </Flex>
              </Box>

              {/* Studio Mission Caption */}
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <Text fontSize="xs" fontWeight="600" color="whiteAlpha.900">
                  {isVietnamese
                    ? 'Không gian làm việc sáng tạo kiến trúc & ý tưởng đa chiều'
                    : 'The Professional Generative Architectural & Concept Workspace'}
                </Text>
                <Text fontSize="2xs" color="whiteAlpha.600">
                  {isVietnamese
                    ? 'Biến ý tưởng thành thiết kế thực tế trong vài giây.'
                    : 'Transform concept sketches into photorealistic renders in seconds.'}
                </Text>
              </Flex>
            </Box>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
