import { drawPaper } from './render';
import type { Size2D, Stroke } from './types';

/** Exported pixels are bounded regardless of the requested generation size. */
export const MAX_EXPORT_SIDE = 2048;
const BLANK_PROBE_SIDE = 48;

export function exportDimensions(size: Size2D, maxSide = MAX_EXPORT_SIDE): Size2D {
  const longest = Math.max(size.width, size.height);
  const scale = longest > maxSide ? maxSide / longest : 1;
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }
  return ctx;
}

/** True when every sampled pixel equals the opaque paper color (for example everything was erased). */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const probe = document.createElement('canvas');
  probe.width = BLANK_PROBE_SIDE;
  probe.height = BLANK_PROBE_SIDE;
  const ctx = context2d(probe);
  ctx.drawImage(canvas, 0, 0, BLANK_PROBE_SIDE, BLANK_PROBE_SIDE);
  const { data } = ctx.getImageData(0, 0, BLANK_PROBE_SIDE, BLANK_PROBE_SIDE);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
      return false;
    }
  }
  return true;
}

export type SketchRenderResult = { canvas: HTMLCanvasElement; blank: boolean };

/** Renders the strokes onto an offscreen canvas with an opaque white background. */
export function renderSketch(strokes: readonly Stroke[], size: Size2D): SketchRenderResult {
  const { width, height } = exportDimensions(size);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);
  drawPaper(ctx, { x: 0, y: 0, width, height }, strokes);
  return { canvas, blank: isCanvasBlank(canvas) };
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('The sketch could not be encoded.'));
      }
    }, 'image/png');
  });
}
