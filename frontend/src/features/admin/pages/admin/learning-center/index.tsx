import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

type Module = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  tag?: string;
  duration?: string;
  category: string;
};

type Section = {
  id: string;
  number: string;
  title: string;
  description: string;
  modules: Module[];
};

const overviewCategories = [
  { key: 'getting-started', label: 'Getting Started', blurb: 'Onboarding & quick wins for new teams' },
  { key: 'creation-tools', label: 'Creation Tools', blurb: 'All generate-first workflows' },
  { key: 'editing-tools', label: 'Editing Tools', blurb: 'Transform and refine existing imagery' },
  { key: 'enhancement-tools', label: 'Enhancement', blurb: 'Upscale, optimize and custom styles' },
  { key: 'templates-styles', label: 'Templates & Styles', blurb: 'Preset systems tailored for architects' },
  { key: 'prompting', label: 'Prompting & AI Assistance', blurb: 'Guided writing and enhancer tips' },
  { key: 'models', label: 'Model Selection', blurb: 'Advanced guidance for expert users' },
  { key: 'workflows', label: 'Workflow Guides', blurb: 'End-to-end playbooks by project type' },
  { key: 'faq', label: 'FAQ & Troubleshooting', blurb: 'Fix inaccurate or inconsistent results' },
  { key: 'release-notes', label: 'Release Notes', blurb: 'What shipped this month' },
];

const recommendedVideos = [
  {
    id: 'introduction-to-bobby',
    title: 'Welcome to Bobby (1 min)',
    duration: '45s',
    description: 'Platform overview + UI tour in under a minute.',
  },
  {
    id: 'wizard-workflow',
    title: 'Wizard Workflow Basics',
    duration: '55s',
    description: 'See the full Außen/Innen flow with prompts, uploads, and templates.',
  },
  {
    id: 'best-first-results',
    title: 'First Results Checklist',
    duration: '40s',
    description: 'Templates, prompts, and credits explained for beginners.',
  },
];

const recentTutorials = [
  {
    id: 'line-drawing-to-image',
    title: 'Line Drawing → Photorealistic Image',
    description: '3 steps to go from plan to mood-ready visual.',
  },
  {
    id: 'edit-image',
    title: 'Material + Lighting Adjustments',
    description: 'How to iterate on a generated image without starting over.',
  },
  {
    id: 'upscaling',
    title: 'Upscaling & Quality Optimization',
    description: 'Choose the right level for print, board reviews, or AR.',
  },
];

const sections: Section[] = [
  {
    id: 'getting-started',
    number: '1',
    title: 'Getting Started (Beginner Essentials)',
    description: 'Fast onboarding sprints for architects joining Bobby for the first time.',
    modules: [
      {
        id: 'introduction-to-bobby',
        title: '1.1 Introduction to Bobby',
        description: 'Platform overview, what you can create, and a UI walkthrough in under a minute.',
        bullets: ['Explore dashboard + navigation', 'See all media types Bobby can produce', 'Understand project + workspace structure'],
        tag: '30–60s video',
        duration: '45s',
        category: 'getting-started',
      },
      {
        id: 'wizard-workflow',
        title: '1.2 The Wizard Workflow',
        description: 'Step through Außen/Innen, input types, uploads, templates, prompt enhancer, and final settings.',
        bullets: ['Switch between Außen/Innen flows', 'Upload drawings, references, or start from templates', 'Use prompt enhancer + advanced settings'],
        tag: 'Workflow demo',
        duration: '55s',
        category: 'getting-started',
      },
      {
        id: 'best-first-results',
        title: '1.3 Best Practices for First Results',
        description: 'Decide how to choose inputs, apply a template, and create your first image with do’s and don’ts.',
        bullets: ['Pick the right input for each scenario', 'Stack templates + prompts intentionally', 'Architect-specific do’s and don’ts'],
        tag: 'Checklist',
        duration: '40s',
        category: 'getting-started',
      },
      {
        id: 'credit-system',
        title: '1.4 Credit System, Quality Levels & Models',
        description: 'Understand when to upscale, how credits are consumed, and which model to choose.',
        bullets: ['When to refine vs. regenerate', 'Bobby AI generation settings', 'Quality levels for board-ready outputs'],
        tag: 'Explainer',
        duration: '60s',
        category: 'getting-started',
      },
    ],
  },
  {
    id: 'creation-tools',
    number: '2',
    title: 'Creation Tools (Generate)',
    description: 'All new media generation modes with quick context, 3-step guides, and tips.',
    modules: [
      {
        id: 'line-drawing-to-image',
        title: '2.1 Line Drawing to Image',
        description: 'Transform sketches or CAD line work into full-scene visuals.',
        bullets: ['10s overview clip', 'When to use: competitions, initial mood boards', '3 steps: upload ➝ prompt ➝ fine tune', 'Architect tips + sample inputs/outputs'],
        tag: 'Generate',
        duration: '50s',
        category: 'creation-tools',
      },
      {
        id: 'text-to-image',
        title: '2.2 Text to Image',
        description: 'Describe the scene and Bobby generates first-pass visuals.',
        bullets: ['Ideal for quick ideation', 'Prompt framework for exteriors/interiors', 'Example prompts with before/after'],
        tag: 'Generate',
        duration: '45s',
        category: 'creation-tools',
      },
      {
        id: 'image-to-image',
        title: '2.3 Image to Image',
        description: 'Upload a base render or inspiration photo and reimagine it.',
        bullets: ['Input guidance (angles, resolution)', 'Style weight tips', 'Comparison slider for iterations'],
        tag: 'Generate',
        duration: '40s',
        category: 'creation-tools',
      },
      {
        id: 'elevation-to-photo',
        title: '2.4 Elevation to Photo',
        description: 'Convert 2D elevations into photorealistic façade previews.',
        bullets: ['Best for façade studies + sales decks', '3 input formatting steps', 'Example of draft ➝ final output'],
        tag: 'Generate',
        duration: '35s',
        category: 'creation-tools',
      },
      {
        id: 'image-to-animation',
        title: '2.5 Image to Animation',
        description: 'Bring static shots to life with subtle motion and camera drifts.',
        bullets: ['Short overview clip', 'When to deploy (marketing, social)', '3-step recipe + output comparison'],
        tag: 'Generate',
        duration: '45s',
        category: 'creation-tools',
      },
    ],
  },
  {
    id: 'editing-tools',
    number: '3',
    title: 'Editing Tools (Edit)',
    description: 'Modify existing renders or Bobby outputs without starting over.',
    modules: [
      {
        id: 'edit-image',
        title: '3.1 Edit Image (Material, Lighting, Options)',
        description: 'Layered editing for finishes, lighting, and mood.',
        bullets: ['Material swaps, lighting passes, overlays', '3-step process + architect tips'],
        tag: 'Edit',
        duration: '50s',
        category: 'editing-tools',
      },
      {
        id: 'replace-objects',
        title: '3.2 Replace Objects',
        description: 'Select an object and replace it with a different asset.',
        bullets: ['Highlight area ➝ describe replacement ➝ confirm', 'Use cases: furniture, façade modules'],
        tag: 'Edit',
        duration: '35s',
        category: 'editing-tools',
      },
      {
        id: 'remove-objects',
        title: '3.3 Remove Objects',
        description: 'Erase unwanted components cleanly.',
        bullets: ['Masking best practices', 'Architectural clean-up tips'],
        tag: 'Edit',
        duration: '30s',
        category: 'editing-tools',
      },
      {
        id: 'change-facade-colors',
        title: '3.4 Change Facade Colors',
        description: 'Swap façade palettes instantly for variant studies.',
        bullets: ['Preset palettes + custom values', 'Before/after comparisons'],
        tag: 'Edit',
        duration: '30s',
        category: 'editing-tools',
      },
      {
        id: 'change-season',
        title: '3.5 Change Season',
        description: 'Move from summer to winter or fall moods in seconds.',
        bullets: ['Landscape + lighting adjustments', 'Tips for hospitality or marketing visuals'],
        tag: 'Edit',
        duration: '30s',
        category: 'editing-tools',
      },
      {
        id: 'change-time-of-day',
        title: '3.6 Change Time of Day',
        description: 'Shift from morning to golden hour or night shots.',
        bullets: ['Lighting controls + exposure tips', 'Example timeline slider'],
        tag: 'Edit',
        duration: '35s',
        category: 'editing-tools',
      },
      {
        id: 'expand-image-borders',
        title: '3.7 Expand Image Borders (Outpainting)',
        description: 'Extend the frame for bigger canvases or alternate crops.',
        bullets: ['Best for hero shots + posters', 'Step-by-step with bounding box tips'],
        tag: 'Edit',
        duration: '40s',
        category: 'editing-tools',
      },
    ],
  },
  {
    id: 'enhancement-tools',
    number: '4',
    title: 'Enhancement Tools (Improve Quality)',
    description: 'Polish, upscale, and brand-match deliverables.',
    modules: [
      {
        id: 'upscaling',
        title: '4.1 Upscaling',
        description: 'Choose quality levels, understand credit usage, and see examples.',
        bullets: ['When to upscale vs. rerender', 'Export presets for boards + print'],
        tag: 'Quality',
        duration: '30s',
        category: 'enhancement-tools',
      },
      {
        id: 'optimize-quality',
        title: '4.2 Optimize Quality',
        description: 'Noise reduction, sharpness, and detail recovery.',
        bullets: ['Recommended defaults', 'Before/after quality slider'],
        tag: 'Quality',
        duration: '35s',
        category: 'enhancement-tools',
      },
      {
        id: 'custom-styles',
        title: '4.3 Custom Styles',
        description: 'Upload and apply your firm’s unique visual DNA.',
        bullets: ['Style library overview', 'Brand governance tips'],
        tag: 'Brand',
        duration: '45s',
        category: 'enhancement-tools',
      },
    ],
  },
  {
    id: 'templates-styles',
    number: '5',
    title: 'Templates & Style System',
    description: 'Preset curation plus roadmap toward custom template creation.',
    modules: [
      {
        id: 'working-with-templates',
        title: '5.1 Working with Templates (Vorlagen)',
        description: 'Select presets, auto-generate prompts, and run Swiss-optimized styles.',
        bullets: ['Template anatomy', 'Auto-prompt generation demo', 'Recommended use cases'],
        tag: 'Templates',
        duration: '40s',
        category: 'templates-styles',
      },
      {
        id: 'style-categories',
        title: '5.2 Style Categories Explained',
        description: 'Modern, Chalet, Holzfassade, MFH/Wohngebäude, Tropisch, Wettbewerbslook, Creative.',
        bullets: ['Visual examples per category', 'Recommendations by phase'],
        tag: 'Templates',
        duration: '50s',
        category: 'templates-styles',
      },
      {
        id: 'create-your-own-templates',
        title: '5.3 Creating Your Own Templates (Future)',
        description: 'Roadmap sneak peek for power users.',
        bullets: ['Collect feedback', 'Early access signup'],
        tag: 'Coming Soon',
        duration: 'Preview',
        category: 'templates-styles',
      },
    ],
  },
  {
    id: 'prompting',
    number: '6',
    title: 'Prompting & AI-Assistance',
    description: 'Teach teams how to talk to Bobby for architect-grade outputs.',
    modules: [
      {
        id: 'prompt-basics',
        title: '6.1 Prompt Basics',
        description: '10 easy examples showing what AI understands best.',
        bullets: ['Structure prompts for clarity', 'Exterior vs. interior phrasing'],
        tag: 'Guide',
        duration: '35s',
        category: 'prompting',
      },
      {
        id: 'ki-prompt-enhancer',
        title: '6.2 Using the KI-Prompt Enhancer',
        description: 'What it does, when to enable, and how to override.',
        bullets: ['On/off decision tree', 'Sample enhanced prompt vs. raw'],
        tag: 'Guide',
        duration: '30s',
        category: 'prompting',
      },
      {
        id: 'prompt-examples',
        title: '6.3 Prompt Examples for Architects',
        description: 'Exterior EFH, MFH, Swiss minimal interiors, material-specific prompts, competition styles, renovation, commercial.',
        bullets: ['Copy-paste templates', 'Context for each scenario'],
        tag: 'Library',
        duration: '40s',
        category: 'prompting',
      },
      {
        id: 'prompt-mistakes',
        title: '6.4 Common Mistakes to Avoid',
        description: 'Avoid bad inputs, overly long prompts, adjective overload, and conflicting instructions.',
        bullets: ['Troubleshooting checklist', 'Before/after corrections'],
        tag: 'Guide',
        duration: '30s',
        category: 'prompting',
      },
    ],
  },
  {
    id: 'models',
    number: '7',
    title: 'Model Selection (Advanced)',
    description: 'Guidance for teams who switch engines frequently.',
    modules: [
      {
        id: 'model-overview',
        title: '7.1 Overview of Available Models',
        description: 'Bobby AI with SDXL, ControlNet, LoRA, sketch-to-image, text-to-image, and image-to-image.',
        bullets: ['Strengths, weaknesses, sample outputs'],
        tag: 'Advanced',
        duration: '45s',
        category: 'models',
      },
      {
        id: 'model-recommendations',
        title: '7.2 When to Choose Which Model',
        description: 'Fastest, most realistic, best for interiors, Außen, sketch inputs, upscaling.',
        bullets: ['Decision matrix', 'Downloadable cheat sheet'],
        tag: 'Advanced',
        duration: '40s',
        category: 'models',
      },
    ],
  },
  {
    id: 'workflows',
    number: '8',
    title: 'Workflow Guides (Architect-focused)',
    description: 'Playbooks that show Bobby inside real architectural processes.',
    modules: [
      {
        id: 'workflow-swiss-sfh',
        title: '8.1 Swiss Single-Family House Workflow',
        description: 'Step-by-step generation from concept to client-ready boards.',
        bullets: ['Inputs, templates, edits, outputs'],
        tag: 'Workflow',
        duration: '5 min',
        category: 'workflows',
      },
      {
        id: 'workflow-mfh',
        title: '8.2 MFH / Wohnüberbauung Workflow',
        description: 'Coordinate masterplans, façades, and marketing imagery.',
        bullets: ['Multi-building tips', 'Team collaboration callouts'],
        tag: 'Workflow',
        duration: '4 min',
        category: 'workflows',
      },
      {
        id: 'workflow-interior',
        title: '8.3 Interior Design Workflow',
        description: 'Detail-level control for Swiss minimal, hospitality, or retail interiors.',
        bullets: ['Input layering', 'Material iteration loops'],
        tag: 'Workflow',
        duration: '4 min',
        category: 'workflows',
      },
      {
        id: 'workflow-competition',
        title: '8.4 Competition / Wettbewerb Workflow',
        description: 'Produce boards with consistent tone for juries.',
        bullets: ['Prompt frameworks', 'Rendering standards'],
        tag: 'Workflow',
        duration: '4 min',
        category: 'workflows',
      },
      {
        id: 'workflow-renovation',
        title: '8.5 Renovation / Umbau / Sanierung Workflow',
        description: 'Document before/after and story-tell upgrades.',
        bullets: ['Input weight tips', 'Comparison overlays'],
        tag: 'Workflow',
        duration: '3 min',
        category: 'workflows',
      },
      {
        id: 'workflow-marketing',
        title: '8.6 Marketing Visuals Workflow',
        description: 'How developers can translate Bobby outputs into brochures + launch assets.',
        bullets: ['Animation + still mix', 'Brand alignment checklist'],
        tag: 'Workflow',
        duration: '3 min',
        category: 'workflows',
      },
    ],
  },
  {
    id: 'faq',
    number: '9',
    title: 'FAQ & Troubleshooting',
    description: 'Each question pairs a short text answer with a checklist/video.',
    modules: [
      {
        id: 'faq-inaccurate-results',
        title: '9.1 Why is my result inaccurate?',
        description: 'Common causes + fixes.',
        bullets: ['Validate prompt clarity', 'Check model + quality settings', 'Review input weight'],
        tag: 'FAQ',
        duration: '2 min',
        category: 'faq',
      },
      {
        id: 'faq-input-not-recognized',
        title: '9.2 My input is not recognized',
        description: 'File prep and troubleshooting flow.',
        bullets: ['Supported file formats', 'Fallback upload tips', 'Contact support triggers'],
        tag: 'FAQ',
        duration: '2 min',
        category: 'faq',
      },
      {
        id: 'faq-style-not-applying',
        title: '9.3 My style doesn’t apply correctly',
        description: 'Why templates or styles might be overridden.',
        bullets: ['Check style weights', 'Template conflicts', 'Reset steps'],
        tag: 'FAQ',
        duration: '2 min',
        category: 'faq',
      },
      {
        id: 'faq-raise-input-weight',
        title: '9.4 When to raise Input Weight',
        description: 'Ensure drawings dominate the output.',
        bullets: ['Line drawing workflows', 'Elevation emphasis'],
        tag: 'FAQ',
        duration: '90s',
        category: 'faq',
      },
      {
        id: 'faq-reduce-style-weight',
        title: '9.5 When to reduce Style Weight',
        description: 'Let custom materials or references show through.',
        bullets: ['Interior iterations', 'Renovation overlays'],
        tag: 'FAQ',
        duration: '90s',
        category: 'faq',
      },
    ],
  },
  {
    id: 'release-notes',
    number: '10',
    title: 'Release Notes & New Features',
    description: 'Short videos announcing the latest improvements.',
    modules: [
      {
        id: 'release-nov',
        title: '10.1 November Drop',
        description: 'Wizard UI refresh + faster Imagen 4 queue.',
        bullets: ['Tour the new layout', 'See speed benchmarks'],
        tag: 'Update',
        duration: '90s',
        category: 'release-notes',
      },
      {
        id: 'release-dec',
        title: '10.2 December Drop',
        description: 'Template pinning + improved prompt enhancer controls.',
        bullets: ['Pin templates to org library', 'Enhancer slider demo'],
        tag: 'Update',
        duration: '80s',
        category: 'release-notes',
      },
    ],
  },
];

const moduleIndex = sections.flatMap((section) =>
  section.modules.map((module) => ({ ...module, sectionTitle: section.title }))
);

const LearningCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return moduleIndex.filter((module) => {
      const haystack = [module.title, module.description, module.sectionTitle, ...(module.bullets || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const handleNavigate = (targetId: string) => {
    if (typeof window === 'undefined') return;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const displayedSections = useMemo(() => {
    if (!activeCategory) return sections;
    return sections.filter((section) => section.id === activeCategory);
  }, [activeCategory]);

  return (
    <Flex direction="column" h="100%" flex={1} overflow="hidden" bg="bg.canvas">
      <Box
        flex={1}
        overflowY="auto"
        px={{ base: 4, md: 6, xl: 10 }}
        pt={6}
        pb={10}
        sx={{
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Stack spacing={10} maxW="1440px" mx="auto">
          <Box>
            <Heading as="h1" fontSize="3xl" fontWeight="semibold" color="text.primary">
              Bobby Learning Center
            </Heading>
            <Text mt={3} fontSize="md" color="text.muted" maxW="720px">
              Copy of the AI Design surface with a focused curriculum. Search for any workflow, browse categories, or jump
              straight into beginner-friendly videos.
            </Text>
          </Box>

          <Box>
            <InputGroup size="lg">
              <Input
                placeholder="Search for tools, workflows, or issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="bg.surface"
                borderColor="border.default"
                borderRadius="xl"
                _focus={{ borderColor: 'zinc.600', boxShadow: '0 0 0 1px var(--chakra-colors-zinc-600)' }}
              />
              <InputRightElement pointerEvents="none">
                <SearchIcon color="text.muted" />
              </InputRightElement>
            </InputGroup>

            {searchQuery && (
              <Box mt={4} borderWidth="1px" borderRadius="xl" borderColor="border.default" bg="bg.surface" p={4}>
                <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={2}>
                  <Heading as="h3" fontSize="lg">
                    Search results ({searchResults.length})
                  </Heading>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </Flex>
                {searchResults.length ? (
                  <Stack mt={4} spacing={3}>
                    {searchResults.slice(0, 6).map((result) => (
                      <Flex
                        key={result.id}
                        justify="space-between"
                        align={{ base: 'flex-start', md: 'center' }}
                        gap={3}
                        flexWrap="wrap"
                        borderWidth="1px"
                        borderColor="border.subtle"
                        borderRadius="lg"
                        p={3}
                      >
                        <Box>
                          <Text fontWeight="semibold">{result.title}</Text>
                          <Text fontSize="sm" color="text.muted">
                            {result.sectionTitle}
                          </Text>
                        </Box>
                        <Button size="sm" variant="outline" onClick={() => handleNavigate(result.id)}>
                          Go to module
                        </Button>
                      </Flex>
                    ))}
                    {searchResults.length > 6 && (
                      <Text fontSize="sm" color="text.muted">
                        Showing 6 of {searchResults.length} matches.
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Text mt={4} fontSize="sm" color="text.muted">
                    No modules match that phrase yet. Try “prompt” or “upscale”.
                  </Text>
                )}
              </Box>
            )}
          </Box>

          <Box>
            <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={3}>
              <Heading as="h2" fontSize="xl">
                Categories
              </Heading>
              {activeCategory && (
                <Button size="sm" variant="ghost" onClick={() => setActiveCategory(null)}>
                  Show all sections
                </Button>
              )}
            </Flex>
            <Text fontSize="sm" color="text.muted" mb={3}>
              Tap a chip to jump to a section • Hover to preview details.
            </Text>
            <Wrap spacing={2}>
              {overviewCategories.map((category) => (
                <WrapItem key={category.key}>
                  <Tooltip label={category.blurb} openDelay={200} hasArrow>
                    <Button
                      size="sm"
                      variant={activeCategory === category.key ? 'solid' : 'outline'}
                      borderRadius="full"
                      px={4}
                      onClick={() => {
                        setActiveCategory(category.key);
                        handleNavigate(category.key);
                      }}
                    >
                      {category.label}
                    </Button>
                  </Tooltip>
                </WrapItem>
              ))}
            </Wrap>
          </Box>

          <Box>
            <Heading as="h2" fontSize="xl" mb={4}>
              Recommended videos for beginners
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {recommendedVideos.map((video) => (
                <Box key={video.id} borderWidth="1px" borderRadius="xl" borderColor="border.default" p={4} bg="bg.surface">
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="semibold">{video.title}</Text>
                    <Badge>{video.duration}</Badge>
                  </Flex>
                  <Text fontSize="sm" color="text.muted">
                    {video.description}
                  </Text>
                  <Button size="sm" mt={4} variant="ghost" onClick={() => handleNavigate(video.id)}>
                    Watch module
                  </Button>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          <Box>
            <Heading as="h2" fontSize="xl" mb={4}>
              Recently added tutorials
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {recentTutorials.map((tutorial) => (
                <Box key={tutorial.id} borderWidth="1px" borderRadius="xl" borderColor="border.default" p={4} bg="bg.surface">
                  <Text fontWeight="semibold">{tutorial.title}</Text>
                  <Text fontSize="sm" color="text.muted" mt={2}>
                    {tutorial.description}
                  </Text>
                  <Button size="sm" mt={4} variant="ghost" onClick={() => handleNavigate(tutorial.id)}>
                    Open tutorial
                  </Button>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {displayedSections.map((section, index) => (
            <Box key={section.id} id={section.id}>
              {index !== 0 && <Divider mb={8} />}
              <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} wrap="wrap" gap={3} mb={4}>
                <Box>
                  <Badge colorScheme="zinc" variant="subtle" mb={2}>
                    Section {section.number}
                  </Badge>
                  <Heading as="h2" fontSize="2xl">
                    {section.title}
                  </Heading>
                  <Text mt={2} fontSize="md" color="text.muted">
                    {section.description}
                  </Text>
                </Box>
                <Button variant="outline" size="sm" onClick={() => setActiveCategory(section.id)}>
                  Focus on this section
                </Button>
              </Flex>
              <Stack spacing={4}>
                {section.modules.map((module) => (
                  <Box key={module.id} id={module.id} borderWidth="1px" borderColor="border.default" borderRadius="xl" p={4} bg="bg.surface">
                    <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} wrap="wrap" gap={3}>
                      <Box>
                        <Heading as="h3" fontSize="lg">
                          {module.title}
                        </Heading>
                        <Text mt={2} color="text.muted">
                          {module.description}
                        </Text>
                      </Box>
                      <Stack direction="row" spacing={2} align="center" justify="flex-end">
                        {module.tag ? (
                          <Badge colorScheme="zinc" variant="subtle">
                            {module.tag}
                          </Badge>
                        ) : null}
                        {module.duration ? <Badge>{module.duration}</Badge> : null}
                      </Stack>
                    </Flex>
                    {module.bullets && (
                      <Stack mt={4} spacing={2}>
                        {module.bullets.map((bullet) => (
                          <Flex key={bullet} align="flex-start" gap={2}>
                            <Box mt={1} w="6px" h="6px" borderRadius="full" bg="zinc.500" />
                            <Text fontSize="sm">{bullet}</Text>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                    <Button mt={4} size="sm" variant="ghost" onClick={() => handleNavigate(module.id)}>
                      Jump to resources
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Flex>
  );
};

export default LearningCenter;



