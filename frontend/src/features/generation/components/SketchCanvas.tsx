import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import { Brush, Eraser, Hand, Redo2, Trash2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { drawPaper, drawStroke } from '../canvas/render';
import { toNormalized } from '../canvas/view';
import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_ERASER_SIZE,
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  type Stroke,
  type StrokeInput,
  type StrokeTool,
} from '../canvas/types';
import { usePanZoom } from './usePanZoom';
import { focusRing, panelStyle, touchSize } from './styles';
import { ZoomControls } from './ZoomControls';

type Tool = StrokeTool | 'pan';

interface ActiveStroke {
  pointerId: number;
  tool: StrokeTool;
  size: number;
  points: number[];
}

export interface SketchCanvasProps {
  strokes: readonly Stroke[];
  /** Width / height of the paper, from the selected generation size. */
  aspect: number;
  canUndo: boolean;
  canRedo: boolean;
  limitReached: boolean;
  onStroke(stroke: StrokeInput): void;
  onUndo(): void;
  onRedo(): void;
  onClear(): void;
  /** True while a pointer is down. The scheduler waits for the stroke commit instead of exporting mid-stroke. */
  onDrawingChange(active: boolean): void;
}

/**
 * Pointer-Events sketch surface. Moves only paint locally; a stroke is committed (once) on pointer
 * up, cancel or lost capture. Nothing is exported or stored while the pointer moves.
 */
export function SketchCanvas({ strokes, aspect, canUndo, canRedo, limitReached, onStroke, onUndo, onRedo, onClear, onDrawingChange }: SketchCanvasProps) {
  const { t } = useTranslation('studio');
  const pz = usePanZoom(aspect);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<ActiveStroke | null>(null);
  const spaceRef = useRef(false);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_SIZE);
  const [dpr, setDpr] = useState(() => Math.min(3, Math.max(1, window.devicePixelRatio || 1)));
  const clearDialog = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const helpId = useId();
  const { viewport, rect } = pz;

  // Device-pixel-ratio aware backing store.
  useEffect(() => {
    const update = () => setDpr(Math.min(3, Math.max(1, window.devicePixelRatio || 1)));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || viewport.width === 0 || viewport.height === 0) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    drawPaper(ctx, rect, strokes);
  }, [dpr, rect, strokes, viewport.height, viewport.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = Math.max(1, Math.round(viewport.width * dpr));
    canvas.height = Math.max(1, Math.round(viewport.height * dpr));
    redraw();
  }, [dpr, redraw, viewport.height, viewport.width]);

  // Never leave the scheduler waiting for a stroke that can no longer finish.
  useEffect(
    () => () => {
      if (activeRef.current) {
        activeRef.current = null;
        onDrawingChange(false);
      }
    },
    [onDrawingChange]
  );

  const toPaper = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    const bounds = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    return toNormalized({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, rect);
  };

  const drawLive = (active: ActiveStroke, fromPoint: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    drawStroke(ctx, active, rect, fromPoint);
    ctx.restore();
  };

  const finishStroke = (pointerId: number, element: HTMLElement | null) => {
    const active = activeRef.current;
    if (!active || active.pointerId !== pointerId) {
      return; // pointerup, pointercancel and lostpointercapture can all fire: commit exactly once
    }
    activeRef.current = null;
    try {
      element?.releasePointerCapture(pointerId);
    } catch {
      // already released
    }
    onStroke({ tool: active.tool, size: active.size, points: active.points });
    onDrawingChange(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) {
      return;
    }
    if (tool === 'pan' || event.button === 1 || spaceRef.current) {
      pz.beginPan(event);
      return;
    }
    if (activeRef.current) {
      return; // a second finger does not start another stroke
    }
    const point = toPaper(event);
    if (point.x < -0.02 || point.x > 1.02 || point.y < -0.02 || point.y > 1.02) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // capture is best effort; up/cancel on the element still end the stroke
    }
    const drawingTool: StrokeTool = tool === 'eraser' ? 'eraser' : 'brush';
    const active: ActiveStroke = {
      pointerId: event.pointerId,
      tool: drawingTool,
      size: drawingTool === 'eraser' ? eraserSize : brushSize,
      points: [point.x, point.y],
    };
    activeRef.current = active;
    onDrawingChange(true);
    drawLive(active, 0);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      pz.movePan(event);
      return;
    }
    const native = event.nativeEvent;
    const samples = typeof native.getCoalescedEvents === 'function' && native.getCoalescedEvents().length > 0 ? native.getCoalescedEvents() : [native];
    const before = active.points.length / 2;
    for (const sample of samples) {
      const point = toPaper(sample);
      active.points.push(point.x, point.y);
    }
    drawLive(active, Math.max(0, before - 1));
  };

  const endPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pz.endPan(event);
    finishStroke(event.pointerId, event.currentTarget);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (modifier && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        onRedo();
      } else {
        onUndo();
      }
      return;
    }
    if (modifier && key === 'y') {
      event.preventDefault();
      onRedo();
      return;
    }
    if (event.key === 'Escape') {
      setTool('brush'); // leaves a temporary tool; never deletes content
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      spaceRef.current = true;
      return;
    }
    if (!modifier && (event.key === '+' || event.key === '=')) {
      pz.zoomIn();
    } else if (!modifier && (event.key === '-' || event.key === '_')) {
      pz.zoomOut();
    } else if (!modifier && event.key === '0') {
      pz.fit();
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ') {
      spaceRef.current = false;
    }
  };

  const toolButton = (value: Tool, label: string, icon: JSX.Element) => (
    <Tooltip label={label} hasArrow>
      <IconButton
        aria-label={label}
        aria-pressed={tool === value}
        icon={icon}
        onClick={() => setTool(value)}
        variant={tool === value ? 'solid' : 'ghost'}
        minW={touchSize}
        h={touchSize}
        _focusVisible={focusRing}
      />
    </Tooltip>
  );

  const sizeValue = tool === 'eraser' ? eraserSize : brushSize;
  const sizeLabel = tool === 'eraser' ? t('sketch.eraser_size') : t('sketch.brush_size');

  return (
    <Flex direction="column" gap={2} minW={0} h="100%">
      <Flex wrap="wrap" align="center" gap={1} role="toolbar" aria-label={t('sketch.toolbar')}>
        {toolButton('brush', t('sketch.brush'), <Brush size={16} />)}
        {toolButton('eraser', t('sketch.eraser'), <Eraser size={16} />)}
        {toolButton('pan', t('sketch.pan'), <Hand size={16} />)}
        <Flex align="center" gap={2} px={2} minW="120px" flex="1 1 120px" maxW="200px">
          <Slider
            aria-label={sizeLabel}
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            step={1}
            value={sizeValue}
            isDisabled={tool === 'pan'}
            onChange={(next) => (tool === 'eraser' ? setEraserSize(next) : setBrushSize(next))}
            focusThumbOnChange={false}
          >
            <SliderTrack>
              <SliderFilledTrack bg="brand.600" />
            </SliderTrack>
            <SliderThumb boxSize={5} _focusVisible={focusRing} />
          </Slider>
          <Text fontSize="xs" color="text.muted" minW="28px" textAlign="end" aria-hidden="true">
            {sizeValue}
          </Text>
        </Flex>
        <Tooltip label={t('sketch.undo')} hasArrow>
          <IconButton aria-label={t('sketch.undo')} icon={<Undo2 size={16} />} onClick={onUndo} isDisabled={!canUndo} variant="ghost" minW={touchSize} h={touchSize} _focusVisible={focusRing} />
        </Tooltip>
        <Tooltip label={t('sketch.redo')} hasArrow>
          <IconButton aria-label={t('sketch.redo')} icon={<Redo2 size={16} />} onClick={onRedo} isDisabled={!canRedo} variant="ghost" minW={touchSize} h={touchSize} _focusVisible={focusRing} />
        </Tooltip>
        <Tooltip label={t('sketch.clear')} hasArrow>
          <IconButton
            aria-label={t('sketch.clear')}
            icon={<Trash2 size={16} />}
            onClick={clearDialog.onOpen}
            isDisabled={!canUndo && !canRedo}
            variant="ghost"
            minW={touchSize}
            h={touchSize}
            _focusVisible={focusRing}
          />
        </Tooltip>
        <Box ms="auto">
          <ZoomControls zoom={pz.view.zoom} canZoomIn={pz.canZoomIn} canZoomOut={pz.canZoomOut} onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onFit={pz.fit} />
        </Box>
      </Flex>

      <Box
        ref={pz.viewportRef}
        role="group"
        aria-label={t('sketch.canvas_label')}
        aria-describedby={helpId}
        aria-keyshortcuts="Control+Z Control+Shift+Z Meta+Z Meta+Shift+Z"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        position="relative"
        flex="1"
        minH={{ base: '260px', md: '320px' }}
        {...panelStyle}
        bg="bg.muted"
        borderRadius="12px"
        overflow="hidden"
        _focusVisible={focusRing}
      >
        <canvas
          ref={canvasRef}
          data-testid="sketch-canvas"
          role="img"
          aria-label={t('sketch.canvas_image')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: tool === 'pan' ? (pz.panning ? 'grabbing' : 'grab') : 'crosshair',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onLostPointerCapture={endPointer}
        />
      </Box>
      <Text id={helpId} fontSize="xs" color="text.muted">
        {limitReached ? t('sketch.limit_reached') : t('sketch.help')}
      </Text>

      <AlertDialog isOpen={clearDialog.isOpen} leastDestructiveRef={cancelRef} onClose={clearDialog.onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="semibold">
              {t('sketch.clear_title')}
            </AlertDialogHeader>
            <AlertDialogBody>{t('sketch.clear_body')}</AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={clearDialog.onClose} variant="outline" h={touchSize}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                h={touchSize}
                onClick={() => {
                  clearDialog.onClose();
                  onClear();
                }}
              >
                {t('sketch.clear_confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
}
