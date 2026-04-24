import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Flex, HStack, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Text, useColorModeValue } from '@chakra-ui/react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { preprocessSketch } from '@/utils/sketchPreprocessor';

interface SketchCanvasProps {
  onChange: (dataUrl: string | null) => void;
}

const CANVAS_SIZE = 512;

const SketchCanvas: React.FC<SketchCanvasProps> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [brushSize, setBrushSize] = useState(6);
  const [isErasing, setIsErasing] = useState(false);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const textColor = useColorModeValue('text.muted', 'text.muted');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  };

  const emitCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const rawDataUrl = canvas.toDataURL('image/png');
      // Auto-preprocess the sketch for better ControlNet conditioning
      const processed = await preprocessSketch(rawDataUrl);
      onChange(processed.dataUrl);
    } catch (error) {
      console.error('Failed to preprocess sketch:', error);
      // Fallback to raw canvas if preprocessing fails
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getPoint(event);
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    const point = getPoint(event);

    if (isErasing) {
      context.clearRect(point.x - brushSize / 2, point.y - brushSize / 2, brushSize, brushSize);
    } else {
      context.strokeStyle = '#111111';
      context.lineWidth = brushSize;
      context.lineTo(point.x, point.y);
      context.stroke();
    }
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    emitCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    onChange(null);
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsPreprocessing(true);
    try {
      const result = await preprocessSketch(canvas.toDataURL('image/png'));

      // Trigger download
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    } finally {
      setIsPreprocessing(false);
    }
  };

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="18px"
        overflow="hidden"
        bg="white"
        boxShadow="inset 0 0 0 1px rgba(0,0,0,0.03)"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            display: 'block',
            touchAction: 'none',
            cursor: isErasing ? 'cell' : 'crosshair',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="Sketch drawing canvas"
        />
      </Box>

      <Box mt={3}>
        <Flex align="center" gap={2} mb={3}>
          <Text fontSize="xs" color="text.muted" fontWeight="semibold">
            Brush size
          </Text>
          <Text fontSize="sm" fontWeight="bold" minW="30px">
            {brushSize}px
          </Text>
        </Flex>
        <Slider min={2} max={18} value={brushSize} onChange={setBrushSize}>
          <SliderTrack bg="bg.muted">
            <SliderFilledTrack bg="zinc.900" _dark={{ bg: 'white' }} />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <HStack mt={4} spacing={2} justify="flex-end">
        <Button
          size="sm"
          variant={isErasing ? 'solid' : 'outline'}
          bg={isErasing ? 'zinc.900' : undefined}
          color={isErasing ? 'white' : undefined}
          _dark={isErasing ? { bg: 'white', color: 'black' } : undefined}
          onClick={() => setIsErasing(!isErasing)}
        >
          {isErasing ? '🧹 Erasing' : '✏️ Draw'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Download size={14} />}
          onClick={handleExport}
          isLoading={isPreprocessing}
          loadingText="Processing"
        >
          Export
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Trash2 size={14} />} onClick={clearCanvas}>
          Clear
        </Button>
      </HStack>
    </Box>
  );
};

export default SketchCanvas;



