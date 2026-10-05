import { BRUSH_REFERENCE_WIDTH, INK_COLOR, PAPER_COLOR, type Rect, type Stroke } from './types';

/** The subset of CanvasRenderingContext2D used for drawing; keeps rendering testable and DOM-free. */
export type DrawContext = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'arc' | 'fill' | 'fillRect' | 'save' | 'restore' | 'rect' | 'clip'
> & {
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
};

export function strokeColor(tool: Stroke['tool']): string {
  // The eraser paints the opaque paper color so on-screen output and the exported PNG always agree.
  return tool === 'eraser' ? PAPER_COLOR : INK_COLOR;
}

export function strokeLineWidth(size: number, paperWidth: number): number {
  return Math.max(1, (size / BRUSH_REFERENCE_WIDTH) * paperWidth);
}

export function drawStroke(
  ctx: DrawContext,
  stroke: Pick<Stroke, 'tool' | 'size' | 'points'>,
  rect: Rect,
  fromPoint = 0
): void {
  const count = Math.floor(stroke.points.length / 2);
  if (count === 0) {
    return;
  }
  const width = strokeLineWidth(stroke.size, rect.width);
  const color = strokeColor(stroke.tool);
  const px = (index: number) => rect.x + stroke.points[index * 2] * rect.width;
  const py = (index: number) => rect.y + stroke.points[index * 2 + 1] * rect.height;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (count === 1) {
    ctx.beginPath();
    ctx.arc(px(0), py(0), width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  const start = Math.max(0, Math.min(fromPoint, count - 1));
  ctx.moveTo(px(start), py(start));
  for (let i = start + 1; i < count; i += 1) {
    ctx.lineTo(px(i), py(i));
  }
  ctx.stroke();
}

/** Paints the opaque paper and every stroke, clipped to the paper rectangle. */
export function drawPaper(ctx: DrawContext, rect: Rect, strokes: readonly Stroke[]): void {
  ctx.save();
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  for (const stroke of strokes) {
    drawStroke(ctx, stroke, rect);
  }
  ctx.restore();
}
