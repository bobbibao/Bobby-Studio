import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
  useTheme,
  Badge,
  Checkbox,
  Radio,
  RadioGroup,
  Stack,
  Select,
  Textarea,
  Switch,
  Divider,
  SimpleGrid,
  useColorModeValue,
  FormControl,
  FormLabel,
  FormErrorMessage,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import React, { useState } from 'react';
import SharedButton from '../../shared/buttons/Button';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import Pagination from '@/components/Pagination';
import QuickActionCard from '../../features/admin/pages/admin/ai-design/components/QuickActionCard';
import PricingCard from '@/components/PricingCard';
import { SUBSCRIPTION_TYPE_ENUM } from '@/types';
import CardProject from '../../shared/card/CardProject';
import { BadgeGenerationType } from '@/components/BadgeGenerationType';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, ChevronDownIcon, InfoIcon } from '@chakra-ui/icons';
import ThreeDotIcon from '../../shared/icons/ThreeDotIcon';

// Import Custom Icons
import AIDesignIcon from '../../shared/icons/AIDesignIcon';
import HomeIcon from '../../shared/icons/HomeIcon';
import MagicIcon from '../../shared/icons/MagicIcon';
import PhotoIcon from '../../shared/icons/PhotoIcon';
import VideoIcon from '../../shared/icons/VideoIcon';
import UpscaleIcon from '../../shared/icons/UpscaleIcon';
import CanvasIcon from '../../shared/icons/CanvasIcon';

// --- Mocks & Helpers ---

const Card = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  const bg = useColorModeValue('white', 'gray.800');
  return (
    <Box bg={bg} borderRadius="lg" boxShadow="sm" p={6} {...props}>
      {children}
    </Box>
  );
};

// Mock InputField to avoid complex imports if any
const InputField = ({ label, placeholder, state, disabled }: any) => (
  <FormControl isInvalid={state === 'error'} isDisabled={disabled}>
    <FormLabel>{label}</FormLabel>
    <Input
      placeholder={placeholder}
      borderColor={state === 'error' ? 'red.500' : 'gray.200'}
      focusBorderColor={state === 'success' ? 'green.500' : 'zinc.600'}
      _placeholder={{ color: state === 'error' ? 'red.500' : 'gray.400' }}
    />
    {state === 'error' && <FormErrorMessage>Error message example</FormErrorMessage>}
  </FormControl>
);

const StyleGuide = () => {
  const theme = useTheme();
  const bg = useColorModeValue('gray.50', 'gray.900');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Constants from theme/index.ts
  const THEME_CONSTANTS = {
    PURPLE: '#111113',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    LIGHT_SLATE: '#e6e6e6',
    LIGHT_GREY: '#F5F5F5',
    DARK_GREY: '#212529',
    DARK_SLATE: '#2F4F4F',
    GUNMETAL: '#28333D',
    ELECTRIC_BLUE: '#007BFF',
    CRIMSON: '#DC143C',
    OFF_WHITE: '#F5F5F5',
  };

  // Hardcoded colors found in codebase
  const HARDCODED_COLORS = {
    '#4f6b72': 'Primary 100',
    '#445d63': 'Primary 200',
    '#3a4f54': 'Primary 300',
    '#303f44': 'Primary 400',
    '#111113': 'Primary 500 / Purple',
    '#253232': 'Primary 600',
    '#1b2426': 'Primary 700',
    '#111717': 'Primary 800',
    '#2e3943': 'Secondary 100',
    '#28333d': 'Secondary 200',
    '#222d37': 'Secondary 300',
    '#1d2731': 'Secondary 400',
    '#1C2833': 'Secondary 500',
    '#161e28': 'Secondary 600',
    '#101722': 'Secondary 700',
    '#0a111c': 'Secondary 800',
    '#339aff': 'Accent 100',
    '#2f8ae5': 'Accent 200',
    '#2b79cc': 'Accent 300',
    '#2769b3': 'Accent 400',
    '#007BFF': 'Accent 500',
    '#1f5a99': 'Accent 600',
    '#1b4a80': 'Accent 700',
    '#173966': 'Accent 800',
    '#4318FF': 'ThemedSelect Blue',
    '#F4F7FE': 'ThemedSelect Light',
    '#6366f1': 'Indigo 500',
    '#E0E0E0': 'Border Light',
    '#2E2E2E': 'Border Dark',
    '#A0AEC0': 'Text Gray',
    '#6C757D': 'Text Secondary',
    '#A26EF4': 'Upload Icon Purple',
    '#805AD5': 'Upload Icon Light',
    '#a26ef4': 'Upload Icon Dark / Pagination',
    '#3182CE': 'Folder Tree Blue',
    '#131516': 'Dark Bg 1',
    '#1E1E1E': 'Dark Bg 2',
    '#6B6B6B': 'Text Dark Gray',
    '#4C1D95': 'Purple Dark',
    '#F7FAFC': 'Pill Light',
    '#1A202C': 'Pill Dark',
    '#EDF2F7': 'Pill Hover Light',
    '#E2E8F0': 'Pill Active Light',
    '#333333': 'Popover Border Dark',
    '#B3B3B3': 'Placeholder Dark',
    '#7F56D9': 'Checkbox Purple',
    '#1C1C1C': 'Checkbox Dark',
    '#383838': 'Border Dark 2',
    '#faf7f2': 'Canvas Light',
    '#3E3E3E': 'Hover Dark',
    '#4E4E4E': 'Active Dark',
    '#0E0E0E': 'Dark Overlay',
    '#4F1D9B': 'AI Design Icon',
    '#198754': 'Green Text',
    '#D1E7DD': 'Green Bg Light',
    '#051B11': 'Green Bg Dark',
    '#D0D0D0': 'Gray',
    '#9333ea': 'Purple',
    '#F3E8FF': 'Pricing Card Bg Hover (Purple Tint)',
    'rgba(0, 0, 0, 0.6)': 'Card Overlay',
  };

  const HARDCODED_PIXEL_VALUES = [
    'width="200px" (FolderTree)',
    'width="120px" (CustomDragPreview)',
    'width="320px" (GenerationNavBar)',
    'height="40px" (GenerationNavBar)',
    'height="120px" (CustomDragPreview)',
    'minW="20px" (GenerationNavBar)',
    'fontSize="14px" (TeamSection)',
    'fontSize="24px" (Heading)',
    'padding="8px"',
    'margin="10px"',
  ];

  const HARDCODED_BORDER_RADIUS = [
    'borderRadius="4px"',
    'borderRadius="6px"',
    'borderRadius="8px"',
    'borderRadius="12px"',
    'borderRadius="16px"',
    'borderRadius="24px"',
  ];

  const HARDCODED_Z_INDEX = [
    'zIndex={1}',
    'zIndex={2}',
    'zIndex={10}',
    'zIndex={20}',
    'zIndex={100}',
    'zIndex={1000}',
    'zIndex={1500}',
    'zIndex={9999}',
    'zIndex={10001}',
    'zIndex={11000}',
    'zIndex={99999}',
  ];

  const HARDCODED_BOX_SHADOW = [
    'boxShadow="lg"',
    'boxShadow="xl"',
    'boxShadow="2xl"',
    'boxShadow="0 8px 24px rgba(0, 0, 0, 0.25)"',
  ];

  // Generation Type Badge Colors
  const GENERATION_TYPE_COLORS = {
    'Text to Image': { text: '#de4958', bg: '#f9dbdE' },
    'Image Upscaling': { text: '#198754', bg: '#d1e7dd' },
    'Image to Image': { text: '#0d6efd', bg: '#e7f1ff' },
    'Line Drawing': { text: '#5b21b6', bg: '#f3e8ff' },
    'Unknown': { text: '#fff', bg: '#1c1f26' },
  };

  // Extract colors from theme to display
  const renderColorSection = (colorName: string, colorObj: any) => {
    if (!colorObj) return null;

    if (typeof colorObj === 'string') {
      return (
        <Flex key={colorName} align="center" mb={2}>
          <Box w="50px" h="50px" bg={colorObj} borderRadius="md" mr={4} border="1px solid #eee" />
          <Box>
            <Text fontWeight="bold">{colorName}</Text>
            <Text fontSize="sm" color="gray.500">
              {colorObj}
            </Text>
          </Box>
        </Flex>
      );
    }

    return (
      <Box key={colorName} mb={6}>
        <Heading size="md" mb={4} textTransform="capitalize">
          {colorName}
        </Heading>
        <SimpleGrid columns={[2, 3, 4, 5]} spacing={4}>
          {Object.entries(colorObj).map(([shade, value]) => (
            <Box key={shade}>
              <Box w="100%" h="80px" bg={value as string} borderRadius="md" mb={2} border="1px solid #eee" />
              <Text fontWeight="bold">
                {colorName}.{shade}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {value as string}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    );
  };

  const renderConstantsSection = () => {
    return (
      <Box mb={6}>
        <Heading size="md" mb={4} textTransform="capitalize">
          Theme Constants (Hardcoded in theme/index.ts)
        </Heading>
        <SimpleGrid columns={[2, 3, 4, 5]} spacing={4}>
          {Object.entries(THEME_CONSTANTS).map(([name, value]) => (
            <Box key={name}>
              <Box w="100%" h="80px" bg={value} borderRadius="md" mb={2} border="1px solid #eee" />
              <Text fontWeight="bold">
                {name}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    );
  };

  const renderHardcodedSection = () => {
    return (
      <Box mb={6}>
        <Heading size="md" mb={4} textTransform="capitalize">
          Hardcoded Colors (Found in Codebase)
        </Heading>
        <Text mb={4} fontSize="sm" color="gray.500">
          These colors are used directly as hex strings in various components.
        </Text>
        <SimpleGrid columns={[2, 3, 4, 5]} spacing={4}>
          {Object.entries(HARDCODED_COLORS).map(([hex, description]) => (
            <Box key={hex}>
              <Box w="100%" h="80px" bg={hex} borderRadius="md" mb={2} border="1px solid #eee" />
              <Text fontWeight="bold">
                {hex}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    );
  };

  const renderOtherHardcodedValues = () => {
    return (
        <Box mb={6}>
            <Heading size="md" mb={4} textTransform="capitalize">
                Other Hardcoded Values (Found in Codebase)
            </Heading>
            <Text mb={4} fontSize="sm" color="gray.500">
                These are common hardcoded style values found across the application that should be tokenized.
            </Text>
            
            <SimpleGrid columns={[1, 2]} spacing={8}>
                <Box>
                    <Text fontWeight="bold" mb={2}>Dimensions & Typography (px)</Text>
                    <VStack align="start" spacing={1}>
                        {HARDCODED_PIXEL_VALUES.map((val, idx) => (
                            <Badge key={idx} colorScheme="orange" variant="subtle">{val}</Badge>
                        ))}
                    </VStack>
                </Box>

                <Box>
                    <Text fontWeight="bold" mb={2}>Border Radius</Text>
                    <VStack align="start" spacing={1}>
                        {HARDCODED_BORDER_RADIUS.map((val, idx) => (
                            <Badge key={idx} colorScheme="blue" variant="subtle">{val}</Badge>
                        ))}
                    </VStack>
                </Box>

                <Box>
                    <Text fontWeight="bold" mb={2}>Z-Index</Text>
                    <VStack align="start" spacing={1}>
                        {HARDCODED_Z_INDEX.map((val, idx) => (
                            <Badge key={idx} colorScheme="purple" variant="subtle">{val}</Badge>
                        ))}
                    </VStack>
                </Box>

                <Box>
                    <Text fontWeight="bold" mb={2}>Box Shadow</Text>
                    <VStack align="start" spacing={1}>
                        {HARDCODED_BOX_SHADOW.map((val, idx) => (
                            <Badge key={idx} colorScheme="gray" variant="subtle">{val}</Badge>
                        ))}
                    </VStack>
                </Box>
            </SimpleGrid>
        </Box>
    );
  };
  
  const renderGenerationTypeColors = () => {
    return (
      <Box mb={6}>
        <Heading size="md" mb={4} textTransform="capitalize">
            Generation Type Badge Colors (utils/generationTypeStyles.ts)
        </Heading>
        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
            {Object.entries(GENERATION_TYPE_COLORS).map(([name, { text, bg }]) => (
                <Flex key={name} align="center" p={4} bg="white" dark={{bg: "gray.800"}} borderRadius="md" boxShadow="sm">
                    <Box w="60px" h="40px" bg={bg} color={text} display="flex" alignItems="center" justifyContent="center" borderRadius="md" fontWeight="bold" mr={4} border="1px solid #eee">
                        Aa
                    </Box>
                    <Box>
                        <Text fontWeight="bold">{name}</Text>
                        <Text fontSize="xs" color="gray.500">BG: {bg}</Text>
                        <Text fontSize="xs" color="gray.500">Text: {text}</Text>
                    </Box>
                </Flex>
            ))}
        </SimpleGrid>
      </Box>
    );
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }} bg={bg} minH="100vh">
      <Container maxW="container.xl" pb={20}>
        <Heading mb={10}>Style Guide</Heading>

        {/* Typography Section */}
        <Card mb={8}>
          <Heading size="lg" mb={6}>
            Typography
          </Heading>
          <VStack align="start" spacing={6}>
            <Box>
              <Heading size="2xl">Heading 2xl</Heading>
              <Text color="gray.500">Font size: 4xl | Line height: 1.2</Text>
            </Box>
            <Box>
              <Heading size="xl">Heading xl</Heading>
              <Text color="gray.500">Font size: 2xl | Line height: 1.2</Text>
            </Box>
            <Box>
              <Heading size="lg">Heading lg</Heading>
              <Text color="gray.500">Font size: xl | Line height: 1.2</Text>
            </Box>
            <Box>
              <Heading size="md">Heading md</Heading>
              <Text color="gray.500">Font size: lg | Line height: 1.2</Text>
            </Box>
            <Box>
              <Heading size="sm">Heading sm</Heading>
              <Text color="gray.500">Font size: md | Line height: 1.2</Text>
            </Box>
            <Box>
              <Heading size="xs">Heading xs</Heading>
              <Text color="gray.500">Font size: sm | Line height: 1.2</Text>
            </Box>

            <Divider my={4} />

            <Box>
              <Text fontSize="2xl">Text 2xl</Text>
              <Text fontSize="xl">Text xl</Text>
              <Text fontSize="lg">Text lg</Text>
              <Text fontSize="md">Text md (Base)</Text>
              <Text fontSize="sm">Text sm</Text>
              <Text fontSize="xs">Text xs</Text>
            </Box>
          </VStack>
        </Card>

        {/* Icons Section */}
        <Card mb={8}>
             <Heading size="lg" mb={6}>Custom Icons</Heading>
             <Text mb={4} fontSize="sm" color="gray.500">
                A selection of custom icons used throughout the application.
             </Text>
             <HStack spacing={8} align="center">
                 <VStack>
                     <Box p={3} bg="gray.100" _dark={{bg: "gray.700"}} borderRadius="md">
                        <AIDesignIcon active={true} color="#4F1D9B" />
                     </Box>
                     <Text fontSize="xs">AI Design</Text>
                 </VStack>
                 <VStack>
                    <Box p={3} bg="gray.100" _dark={{bg: "gray.700"}} borderRadius="md">
                         <HomeIcon active={true} />
                    </Box>
                    <Text fontSize="xs">Home</Text>
                 </VStack>
                  <VStack>
                     <Box p={3} bg="gray.100" _dark={{bg: "gray.700"}} borderRadius="md">
                         <HomeIcon active={false} />
                    </Box>
                    <Text fontSize="xs">Home (Inactive)</Text>
                 </VStack>
                 <VStack>
                    <Box p={3} bg="gray.100" _dark={{bg: "gray.700"}} borderRadius="md">
                         <MagicIcon />
                    </Box>
                    <Text fontSize="xs">Magic</Text>
                 </VStack>
                 <VStack>
                    <Box p={3} bg="gray.100" _dark={{bg: "gray.700"}} borderRadius="md">
                         <ThreeDotIcon />
                    </Box>
                    <Text fontSize="xs">Three Dot</Text>
                 </VStack>
             </HStack>
        </Card>

        {/* Components Section */}
        <Card mb={8}>
            <Heading size="lg" mb={6}>
                Application Components
            </Heading>
            <VStack align="start" spacing={10} w="full">
                
                {/* Cards */}
                <Box w="full">
                    <Heading size="md" mb={4}>Cards</Heading>
                    <SimpleGrid columns={[1, 2, 3]} spacing={6}>
                        {/* Pricing Card Mockup */}
                        <Box>
                            <Text mb={2} fontWeight="bold">Pricing Card</Text>
                            <PricingCard 
                                type="month"
                                subscriptionType={SUBSCRIPTION_TYPE_ENUM.BASIC}
                                tag="Popular"
                                description="Perfect for individuals."
                                price="$19"
                                terms={["Feature 1", "Feature 2", "Feature 3"]}
                                onClick={() => {}}
                            />
                        </Box>

                        {/* Project Card Mockup */}
                        <Box>
                             <Text mb={2} fontWeight="bold">Project Card</Text>
                             <CardProject 
                                data={{
                                    projectTitle: "Modern Villa",
                                    projectDescription: "Exterior design concept for a modern villa in the mountains.",
                                    projectAttributeId: "1",
                                    type: "Text to Image",
                                    folderName: "Projects",
                                    folderIndex: 0,
                                    imageId: "1",
                                    imagePath: "", // Placeholder will be used
                                    updatedAt: new Date().toISOString(),
                                    numberOfImages: 4
                                }}
                             />
                        </Box>
                    </SimpleGrid>
                </Box>
                
                 <Divider />

                {/* Inputs */}
                <Box w="full">
                    <Heading size="md" mb={4}>Inputs & Forms</Heading>
                    <VStack spacing={4} align="start" maxW="md">
                         <InputField label="Default Input" placeholder="Enter text..." />
                         <InputField label="Success State" placeholder="Valid input" state="success" />
                         <InputField label="Error State" placeholder="Invalid input" state="error" />
                         <InputField label="Disabled" placeholder="Cannot type" disabled />
                    </VStack>
                </Box>

                <Divider />

                {/* Badges */}
                <Box w="full">
                    <Heading size="md" mb={4}>Badges (Generation Types)</Heading>
                    <HStack spacing={4} flexWrap="wrap">
                        <BadgeGenerationType generationType="Text to Image" />
                        <BadgeGenerationType generationType="Image Upscaling" />
                        <BadgeGenerationType generationType="Image to Image" />
                        <BadgeGenerationType generationType="Line Drawing to Image" />
                    </HStack>
                </Box>
            </VStack>
        </Card>

        {/* Modals & Popovers */}
        <Card mb={8}>
            <Heading size="lg" mb={6}>Modals & Popovers</Heading>
            <HStack spacing={4} align="start">
                <Box>
                    <Button onClick={onOpen} colorScheme="brand">Open Modal</Button>
                    <Modal isOpen={isOpen} onClose={onClose}>
                        <ModalOverlay />
                        <ModalContent>
                        <ModalHeader>Modal Title</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            <Text>This is the modal content. It uses standard Chakra UI components.</Text>
                        </ModalBody>
                        <ModalFooter>
                            <Button colorScheme="blue" mr={3} onClick={onClose}>
                            Close
                            </Button>
                            <Button variant="ghost">Secondary Action</Button>
                        </ModalFooter>
                        </ModalContent>
                    </Modal>
                </Box>

                <Box>
                    <Popover>
                        <PopoverTrigger>
                            <Button>Trigger Popover</Button>
                        </PopoverTrigger>
                        <PopoverContent>
                            <PopoverArrow />
                            <PopoverCloseButton />
                            <PopoverHeader>Popover Title</PopoverHeader>
                            <PopoverBody>Are you sure you want to continue with your action?</PopoverBody>
                        </PopoverContent>
                    </Popover>
                </Box>

                <Box>
                    <Tooltip label="This is a tooltip" aria-label="A tooltip">
                        <Button variant="outline">Hover me (Tooltip)</Button>
                    </Tooltip>
                </Box>
            </HStack>
        </Card>

        {/* Chakra Buttons Section */}
        <Card mb={8}>
          <Heading size="lg" mb={6}>
            Standard Chakra Buttons
          </Heading>
          <Text mb={4} fontSize="sm" color="text.muted">
            Standard Chakra UI buttons. Use these variants to maintain consistency.
          </Text>
          <VStack align="start" spacing={6} w="full">
            <Box w="full">
              <Text mb={4} fontWeight="bold">
                Variants
              </Text>
              <SimpleGrid columns={[2, 3, 4]} spacing={8}>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="primary"</Text>
                  <Button variant="primary">
                    Primary
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="secondary"</Text>
                  <Button variant="secondary">
                    Secondary
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="outline"</Text>
                  <Button variant="outline">
                    Outline
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="ghost"</Text>
                  <Button variant="ghost">
                    Ghost
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="link"</Text>
                  <Button variant="link">
                    Link
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">variant="solid"</Text>
                  <Button variant="solid">
                    Solid (Default)
                  </Button>
                </VStack>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box w="full">
              <Text mb={4} fontWeight="bold">
                Sizes
              </Text>
              <SimpleGrid columns={[2, 3, 4]} spacing={8}>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">size="xs"</Text>
                  <Button size="xs" variant="primary">
                    Extra Small
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">size="sm"</Text>
                  <Button size="sm" variant="primary">
                    Small
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">size="md"</Text>
                  <Button size="md" variant="primary">
                    Medium
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">size="lg"</Text>
                  <Button size="lg" variant="primary">
                    Large
                  </Button>
                </VStack>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box w="full">
              <Text mb={4} fontWeight="bold">
                States
              </Text>
              <SimpleGrid columns={[2, 3, 4]} spacing={8}>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">isDisabled</Text>
                  <Button isDisabled variant="primary">
                    Disabled
                  </Button>
                </VStack>
                <VStack align="start">
                  <Text fontSize="xs" fontFamily="mono" color="text.muted">isLoading</Text>
                  <Button isLoading variant="primary">
                    Loading
                  </Button>
                </VStack>
              </SimpleGrid>
            </Box>
          </VStack>
        </Card>

        {/* Icon Buttons Section */}
        <Card mb={8}>
            <Heading size="lg" mb={6}>Icon Buttons</Heading>
            <Text mb={4} fontSize="sm" color="gray.500">
                `IconButton` is used for actions without text labels. Commonly used in toolbars and menus.
            </Text>
            <HStack spacing={4}>
                <IconButton aria-label="Add" icon={<AddIcon />} />
                <IconButton aria-label="Edit" icon={<EditIcon />} variant="outline" />
                <IconButton aria-label="Delete" icon={<DeleteIcon />} colorScheme="red" />
                <IconButton aria-label="Search" icon={<SearchIcon />} variant="ghost" />
                <IconButton aria-label="Info" icon={<InfoIcon />} colorScheme="blue" variant="ghost" />
            </HStack>
        </Card>

        {/* Menu Buttons Section */}
        <Card mb={8}>
            <Heading size="lg" mb={6}>Menu Buttons</Heading>
             <Text mb={4} fontSize="sm" color="gray.500">
                Used for dropdown menus and actions.
            </Text>
            <HStack spacing={4}>
                 <Menu>
                    <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                        Actions
                    </MenuButton>
                    <MenuList>
                        <MenuItem>Download</MenuItem>
                        <MenuItem>Create a Copy</MenuItem>
                        <MenuItem>Mark as Draft</MenuItem>
                        <MenuItem>Delete</MenuItem>
                    </MenuList>
                </Menu>
                
                 <Menu>
                    <MenuButton as={IconButton} aria-label='Options' icon={<ThreeDotIcon />} variant='ghost' />
                    <MenuList>
                        <MenuItem icon={<EditIcon />}>Edit</MenuItem>
                        <MenuItem icon={<DeleteIcon />}>Delete</MenuItem>
                    </MenuList>
                </Menu>
            </HStack>
        </Card>

        {/* Shared Custom Components */}
        <Card mb={8}>
            <Heading size="lg" mb={6}>Custom Shared Components</Heading>
            <VStack align="start" spacing={6}>
                <Box>
                    <Text mb={2} fontWeight="bold">Filter Button (src/components/FilterButton.tsx)</Text>
                    <Text mb={2} fontSize="sm" color="gray.500">
                        Used for filter toggles (All, Exterior, Interior) and filter dropdown triggers.
                    </Text>
                    <Text mb={4} fontSize="xs" color="gray.400">
                        Colors:
                        <br />- Active Border: zinc.900 (Dark: white)
                        <br />- Inactive Border: zinc.200 (Dark: zinc.700)
                        <br />- Active Text: zinc.900 (Dark: white)
                        <br />- Inactive Text: zinc.600 (Dark: zinc.400)
                        <br />- Hover Border (Active): Same as Active Border (zinc.900 / white)
                        <br />- Hover Border (Inactive): zinc.400 (both modes)
                        <br />- Hover Bg: Transparent
                        <br />- Active Bg: bg.subtle
                        <br />
                        <br />Font Weights:
                        <br />- Active: semibold (600)
                        <br />- Inactive: normal (400)
                        <br />
                        <br />Font Size:
                        <br />- size="sm" (14px / 0.875rem)
                    </Text>
                    <HStack spacing={4}>
                        <FilterButton label="All" isActive={true} />
                        <FilterButton label="Exterior" isActive={false} />
                        <FilterButton label="Filter" rightIcon={<ChevronDownIcon />} />
                    </HStack>
                </Box>

                <Divider />

                <Box>
                    <Text mb={2} fontWeight="bold">Pagination (src/components/Pagination.tsx)</Text>
                    <Text mb={2} fontSize="sm" color="gray.500">
                        Used for pagination controls on pages with paginated content (Inspiration, Favorite, etc.).
                    </Text>
                    <Text mb={4} fontSize="xs" color="gray.400">
                        Previous/Next Buttons:
                        <br />- Variant: outline
                        <br />- Size: sm
                        <br />- Font Size: 14px / 0.875rem
                        <br />- Font Weight: 400 (normal)
                        <br />- Padding: px={4} py={2} (Chakra sm size default)
                        <br />- Border: border.default (zinc.200 / Dark: zinc.800)
                        <br />- Border Width: 1px
                        <br />- Background: bg.surface (white / Dark: zinc.900)
                        <br />- Text: text.primary (zinc.900 / Dark: white)
                        <br />- Icon: PrevIcon/NextIcon (20x20px) with Box wrapper
                        <br />- Icon Position: leftIcon (Previous) / rightIcon (Next)
                        <br />- Hover Bg: bg.subtle (zinc.100 / Dark: zinc.800)
                        <br />- Disabled: opacity 0.4, cursor not-allowed
                        <br />- Border Radius: md (Chakra default)
                        <br />
                        <br />Page Number Buttons:
                        <br />- Active Variant: solid
                        <br />- Inactive Variant: ghost
                        <br />- Size: sm (14px / 0.875rem)
                        <br />- Active Bg: zinc.900 (Light) / white (Dark)
                        <br />- Active Text: white (Light) / zinc.900 (Dark)
                        <br />- Inactive Text: text.muted (zinc.500 / Dark: zinc.400)
                        <br />- Hover Bg (Inactive): bg.subtle (zinc.100 / Dark: zinc.800)
                        <br />- Font Weight: 400 (normal) for all buttons
                        <br />- Min Width: 40px
                        <br />
                        <br />Ellipsis:
                        <br />- Text: text.muted (zinc.500 / Dark: zinc.400)
                        <br />- Padding: px={2}
                    </Text>
                    <Box w="full" maxW="600px">
                        <Pagination
                            total={100}
                            pages={10}
                            pageSize={10}
                            currentPage={5}
                            className=""
                            changePage={() => {}}
                        />
                    </Box>
                </Box>

                <Divider />

                <Box>
                    <Text mb={2} fontWeight="bold">Quick Action Card (src/views/admin/ai-design/components/QuickActionCard.tsx)</Text>
                    <Text mb={2} fontSize="sm" color="gray.500">
                        Used for quick action buttons on the homepage (Image Generator, Image Editor, etc.).
                    </Text>
                    <Text mb={4} fontSize="xs" color="gray.400">
                        Colors:
                        <br />- Background: bg.surface (white / Dark: zinc.900)
                        <br />- Border: border.default (zinc.200 / Dark: zinc.800)
                        <br />- Text: text.primary (zinc.900 / Dark: white)
                        <br />- Hover Border: zinc.400 (both modes)
                        <br />- Badge Bg: brand.600 (#7F56D9)
                    </Text>
                    <SimpleGrid columns={[1, 2, 3]} spacing={4} maxW="800px">
                        <QuickActionCard title="image_generator" icon={<PhotoIcon />} />
                        <QuickActionCard title="image_editor" icon={<MagicIcon />} />
                        <QuickActionCard title="video_generator" icon={<VideoIcon />} />
                        <QuickActionCard title="upscale" icon={<UpscaleIcon />} />
                        <QuickActionCard title="ai_style" icon={<AIDesignIcon />} />
                        <QuickActionCard title="canvas" icon={<CanvasIcon />} isNew={true} />
                    </SimpleGrid>
                </Box>

                <Divider />

                <Box>
                    <Text mb={2} fontWeight="bold">Grid Switcher (src/components/GridSwitcher.tsx)</Text>
                    <Text mb={2} fontSize="sm" color="gray.500">
                        Used to toggle between 3 and 4 column layouts.
                    </Text>
                    <Text mb={4} fontSize="xs" color="gray.400">
                        Colors:
                        <br />- Container Bg: bg.subtle (zinc.100 / Dark: zinc.800)
                        <br />- Border: zinc.200 (Light) / zinc.700 (Dark)
                        <br />- Active Tab Bg: bg.surface (white / Dark: zinc.900)
                        <br />- Active Icon: text.primary (zinc.900 / Dark: white)
                        <br />- Inactive Icon: text.muted (zinc.500 / Dark: zinc.400)
                    </Text>
                    <HStack spacing={4}>
                        <GridSwitcher columns={3} onChange={() => {}} />
                        <GridSwitcher columns={4} onChange={() => {}} />
                    </HStack>
                </Box>

                <Divider />

                <Box>
                    <Text mb={2} fontWeight="bold">Shared Button (src/shared/buttons/Button.tsx)</Text>
                    <Text mb={4} fontSize="sm" color="gray.500">
                        This is the custom button component intended for standardizing buttons across the app. It supports loading states, icons, and custom styling via `extraClass`.
                    </Text>
                    <HStack spacing={4}>
                        <SharedButton label="Default Button" />
                        <SharedButton label="Disabled" isDisabled />
                        <SharedButton label="Loading" isLoading />
                        <SharedButton label="With Icon" icon={<AddIcon />} />
                        <SharedButton label="With Class" extraClass="bg-red-500 text-white" />
                    </HStack>
                </Box>
            </VStack>
        </Card>

        {/* Colors Section */}
        <Card mb={8}>
          <Heading size="lg" mb={6}>
            Colors
          </Heading>
          
          {/* Hardcoded Codebase Colors */}
          {renderHardcodedSection()}

          <Divider my={6} />
          
          {/* Generation Type Colors */}
          {renderGenerationTypeColors()}

          <Divider my={6} />

          {/* Hardcoded Theme Constants */}
          {renderConstantsSection()}

          <Divider my={6} />

          {/* Theme Colors */}
          <Heading size="md" mb={4}>
            Theme Colors (colors.ts)
          </Heading>
          {renderColorSection('zinc', theme.colors.zinc)}
          {renderColorSection('brand', theme.colors.brand)}
          {renderColorSection('success', theme.colors.success)}
          {renderColorSection('error', theme.colors.error)}
        </Card>

        {/* Other Hardcoded Values Section */}
        <Card mb={8}>
            {renderOtherHardcodedValues()}
        </Card>

      </Container>
    </Box>
  );
};

export default StyleGuide;


