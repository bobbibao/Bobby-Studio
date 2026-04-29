import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDragLayer } from 'react-dnd';

const CustomDragPreview: React.FC = () => {
    const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
    isDragging: monitor.isDragging(),
        currentOffset: monitor.getSourceClientOffset(),
      }));
    
  if (!isDragging || !currentOffset || !item?.path) {
        return null;
      }

  return (
    <Box
      position="fixed"
      pointerEvents="none"
      left={0}
      top={0}
      width="100%"
      height="100%"
      zIndex={9999}
    >
      <Box
        position="absolute"
        left={currentOffset.x}
        top={currentOffset.y}
        width="120px"
        height="120px"
      borderRadius="8px"
        boxShadow="0 8px 24px rgba(0, 0, 0, 0.25)"
        overflow="hidden"
        opacity={0.9}
        transform="translate(-50%, -50%) rotate(-3deg)"
        transition="transform 0.1s ease-out"
        border="3px solid white"
    >
        <img
          src={item.path}
          alt="Dragging"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>
    </Box>
  );
};

export default CustomDragPreview;



