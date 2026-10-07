import React, { useState } from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

export type MorphIconType = 'sparkle' | 'model' | 'prompt' | 'lab' | 'menu' | 'zen';

interface MorphIconProps extends BoxProps {
  type: MorphIconType;
  size?: number;
  color?: string;
  isHovered?: boolean;
}

/**
 * High-velocity SVG Morphing Icon component.
 * Uses Framer Motion spring physics and geometric SVG transforms
 * to morph shapes on hover/interaction.
 */
export const MorphIcon: React.FC<MorphIconProps> = ({
  type,
  size = 20,
  color = 'currentColor',
  isHovered: externalHover,
  ...boxProps
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const isHovered = externalHover !== undefined ? externalHover : internalHover;

  const renderIconContent = () => {
    switch (type) {
      case 'sparkle':
        // Morphs from 4-point sparkle star into a multi-faceted glowing diamond
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={isHovered ? { rotate: 45, scale: 1.15 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.path
              d={
                isHovered
                  ? 'M12 2L19 7V17L12 22L5 17V7L12 2Z' // Diamond/Hexagon
                  : 'M12 2C12 7 7 12 2 12C7 12 12 17 12 22C12 17 17 12 22 12C17 12 12 7 12 2Z' // 4-point Sparkle
              }
              fill={isHovered ? 'rgba(127, 86, 217, 0.25)' : 'none'}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
            {isHovered && (
              <motion.circle
                cx="12"
                cy="12"
                r="3"
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.svg>
        );

      case 'model':
        // Morphs between an isometric cube and an AI neural polyhedron
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={isHovered ? { rotate: 180, scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          >
            <motion.path
              d={
                isHovered
                  ? 'M12 2L2 9L12 16L22 9L12 2ZM2 14L12 21L22 14'
                  : 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'
              }
              fill={isHovered ? 'rgba(6, 182, 212, 0.2)' : 'none'}
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
        );

      case 'prompt':
        // Morphs from a magic wand to a radiant text cursor beacon
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={isHovered ? { rotate: -15, scale: 1.15 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          >
            <motion.path
              d={
                isHovered
                  ? 'M4 4H20M4 12H16M4 20H12M18 16L22 20M22 16L18 20' // Prompt terminal with cursor
                  : 'M15 4V2M15 16V14M8 9H10M20 9H18M17.8 11.8L19.2 13.2M17.8 6.2L19.2 4.8M3 21L14 10' // Magic wand
              }
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
        );

      case 'lab':
        // Morphs from a beaker / flask into atomic orbital energy rings
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={isHovered ? { scale: 1.15 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.path
              d={
                isHovered
                  ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z'
                  : 'M10 2v7.31L4.65 18.1A2 2 0 0 0 6.37 21h11.26a2 2 0 0 0 1.72-2.9L14 9.31V2'
              }
              fill={isHovered ? 'rgba(236, 72, 153, 0.2)' : 'none'}
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
        );

      case 'menu':
        // Morphs between 3 lines and a modern condensed arrow
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.line
              x1="3"
              y1="6"
              x2="21"
              y2="6"
              animate={isHovered ? { x2: 15, stroke: '#7F56D9' } : { x2: 21, stroke: color }}
              transition={{ duration: 0.2 }}
            />
            <motion.line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
              animate={isHovered ? { x2: 18, stroke: '#06B6D4' } : { x2: 21, stroke: color }}
              transition={{ duration: 0.2, delay: 0.05 }}
            />
            <motion.line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
              animate={isHovered ? { x2: 12, stroke: '#EC4899' } : { x2: 21, stroke: color }}
              transition={{ duration: 0.2, delay: 0.1 }}
            />
          </motion.svg>
        );

      case 'zen':
        // Morphs between expanding fullscreen and focus crosshairs
        return (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={isHovered ? { rotate: 90, scale: 1.15 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.path
              d={
                isHovered
                  ? 'M12 3v3m0 12v3m-9-9h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
                  : 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'
              }
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
      cursor="pointer"
      transition="transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        filter: 'drop-shadow(0 0 8px rgba(127, 86, 217, 0.5))',
      }}
      {...boxProps}
    >
      {renderIconContent()}
    </Box>
  );
};

export default MorphIcon;
