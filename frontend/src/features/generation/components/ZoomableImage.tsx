import { Box, Image } from '@chakra-ui/react';
import { usePanZoom } from './usePanZoom';
import { ZoomControls } from './ZoomControls';
import type { ReactNode } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  dimmed?: boolean;
  onError(): void;
  /** Rendered inside the viewport, for overlays such as the "Updating" status. */
  overlay?: ReactNode;
}

/** Fit/zoom/pan result viewer. The image keeps its source aspect ratio. */
export function ZoomableImage({ src, alt, width, height, dimmed, onError, overlay }: ZoomableImageProps) {
  const pz = usePanZoom(width / height);
  const { rect } = pz;
  return (
    <Box display="flex" flexDirection="column" gap={2} h="100%" minH={0}>
      <Box
        ref={pz.viewportRef}
        position="relative"
        flex="1"
        minH={{ base: '240px', md: '300px' }}
        bg="bg.muted"
        borderRadius="12px"
        overflow="hidden"
        style={{ touchAction: pz.view.zoom > 1 ? 'none' : 'pan-y', cursor: pz.view.zoom > 1 ? (pz.panning ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={(event) => {
          if (pz.view.zoom > 1) {
            pz.beginPan(event);
          }
        }}
        onPointerMove={pz.movePan}
        onPointerUp={pz.endPan}
        onPointerCancel={pz.endPan}
        onLostPointerCapture={pz.endPan}
      >
        <Image
          src={src}
          alt={alt}
          draggable={false}
          position="absolute"
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          opacity={dimmed ? 0.55 : 1}
          transition="opacity 150ms"
          sx={{ '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}
          borderRadius="2px"
          objectFit="contain"
          onError={onError}
        />
        {overlay}
      </Box>
      <Box alignSelf="flex-end">
        <ZoomControls zoom={pz.view.zoom} canZoomIn={pz.canZoomIn} canZoomOut={pz.canZoomOut} onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onFit={pz.fit} />
      </Box>
    </Box>
  );
}
