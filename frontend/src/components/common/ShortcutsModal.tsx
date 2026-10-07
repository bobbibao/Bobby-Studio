import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Kbd,
  Badge,
  Box,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { Sparkles, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Studio' | 'Navigation' | 'Canvas';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: 'Open Command Palette & Global Search', category: 'Navigation' },
  { keys: ['Ctrl', 'Enter'], description: 'Trigger AI Generation / Render', category: 'Studio' },
  { keys: ['Z'], description: 'Toggle Zen / Fullscreen Creative Mode', category: 'Studio' },
  { keys: ['?'], description: 'Open Shortcuts Cheatsheet', category: 'Navigation' },
  { keys: ['Ctrl', 'Z'], description: 'Undo sketch stroke or edit', category: 'Canvas' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo sketch stroke', category: 'Canvas' },
  { keys: ['B'], description: 'Switch to Brush tool', category: 'Canvas' },
  { keys: ['E'], description: 'Switch to Eraser tool', category: 'Canvas' },
  { keys: ['C'], description: 'Toggle Before / After image comparison', category: 'Studio' },
  { keys: ['S'], description: 'Save current version to Project', category: 'Studio' },
  { keys: ['Esc'], description: 'Close modals, drawers, or reset focus', category: 'Navigation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const bg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(12, 14, 22, 0.95)');
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.1)');
  const kbdBg = useColorModeValue('rgba(0, 0, 0, 0.06)', 'rgba(255, 255, 255, 0.1)');

  const categories: Array<'Studio' | 'Canvas' | 'Navigation'> = ['Studio', 'Canvas', 'Navigation'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
      <ModalContent
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="20px"
        boxShadow="0 25px 60px -15px rgba(0, 0, 0, 0.5)"
        overflow="hidden"
      >
        <ModalHeader display="flex" alignItems="center" gap={2} pb={2} pt={5} px={6}>
          <Box
            p={1.5}
            borderRadius="8px"
            bg="rgba(127, 86, 217, 0.15)"
            color="brand.400"
            display="flex"
            alignItems="center"
          >
            <Command size={18} />
          </Box>
          <Text fontSize="lg" fontWeight="bold" letterSpacing="-0.01em">
            Studio Pro Keyboard Shortcuts
          </Text>
          <Badge ml="auto" mr={6} variant="subtle" colorScheme="purple" borderRadius="full" px={2.5} py={0.5}>
            Cheatsheet
          </Badge>
        </ModalHeader>
        <ModalCloseButton top={5} right={5} borderRadius="full" />

        <ModalBody px={6} pb={6} pt={2}>
          <VStack spacing={4} align="stretch">
            {categories.map((category) => {
              const items = SHORTCUTS.filter((s) => s.category === category);
              return (
                <Box key={category}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="text.muted" mb={2}>
                    {category}
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {items.map((item, idx) => (
                      <HStack
                        key={idx}
                        justify="space-between"
                        py={1.5}
                        px={2.5}
                        borderRadius="10px"
                        _hover={{ bg: 'bg.subtle' }}
                        transition="background 0.15s"
                      >
                        <Text fontSize="sm" color="text.primary">
                          {item.description}
                        </Text>
                        <HStack spacing={1}>
                          {item.keys.map((k, kIdx) => (
                            <Kbd
                              key={kIdx}
                              bg={kbdBg}
                              borderColor={borderColor}
                              color="text.primary"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="6px"
                              fontWeight="semibold"
                            >
                              {k}
                            </Kbd>
                          ))}
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                  {category !== 'Navigation' && <Divider mt={3} borderColor={borderColor} />}
                </Box>
              );
            })}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ShortcutsModal;
