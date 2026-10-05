import { MAX_BRUSH_SIZE, MIN_BRUSH_SIZE, type SketchSnapshot, type Stroke, type StrokeInput } from './types';

/** History bounds keep memory, drafts and exports predictable. */
export const MAX_STROKES = 400;
export const MAX_POINTS_PER_STROKE = 2000;
export const MAX_TOTAL_POINTS = 40000;
export const MAX_REDO_DEPTH = 100;
/** Points closer than this (normalized) to the previous one are dropped while drawing. */
export const MIN_POINT_DISTANCE = 0.0015;

export interface StrokeHistory {
  readonly strokes: readonly Stroke[];
  readonly redo: readonly Stroke[];
  /** Bumps whenever the drawn content changes (commit, undo, redo, clear); identifies a sketch revision. */
  readonly version: number;
  readonly nextId: number;
}

export function createHistory(strokes: readonly Stroke[] = [], version = 0): StrokeHistory {
  const nextId = strokes.reduce((max, stroke) => Math.max(max, stroke.id), 0) + 1;
  return { strokes, redo: [], version, nextId };
}

export function totalPoints(strokes: readonly Stroke[]): number {
  return strokes.reduce((sum, stroke) => sum + stroke.points.length / 2, 0);
}

const round4 = (value: number) => Math.round(value * 10000) / 10000;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Quantizes, clamps and thins raw points; always keeps the first and last point. */
export function simplifyPoints(points: readonly number[]): number[] {
  const out: number[] = [];
  const count = Math.floor(points.length / 2);
  for (let i = 0; i < count; i += 1) {
    const x = round4(clamp01(points[i * 2]));
    const y = round4(clamp01(points[i * 2 + 1]));
    const isLast = i === count - 1;
    if (out.length >= 2) {
      const dx = x - out[out.length - 2];
      const dy = y - out[out.length - 1];
      if (!isLast && Math.hypot(dx, dy) < MIN_POINT_DISTANCE) {
        continue;
      }
    }
    out.push(x, y);
  }
  if (out.length > MAX_POINTS_PER_STROKE * 2) {
    // Keep the shape: subsample evenly, preserving the final point.
    const step = Math.ceil(out.length / 2 / MAX_POINTS_PER_STROKE);
    const thinned: number[] = [];
    for (let i = 0; i < out.length / 2; i += step) {
      thinned.push(out[i * 2], out[i * 2 + 1]);
    }
    const lastX = out[out.length - 2];
    const lastY = out[out.length - 1];
    if (thinned[thinned.length - 2] !== lastX || thinned[thinned.length - 1] !== lastY) {
      thinned.push(lastX, lastY);
    }
    return thinned;
  }
  return out;
}

export function canAcceptStroke(history: StrokeHistory, pointCount: number): boolean {
  return history.strokes.length < MAX_STROKES && totalPoints(history.strokes) + pointCount <= MAX_TOTAL_POINTS;
}

export function isStrokeLimitReached(history: StrokeHistory): boolean {
  return !canAcceptStroke(history, 1);
}

/** Returns the same history object when the stroke is empty or the bounds would be exceeded. */
export function commitStroke(history: StrokeHistory, input: StrokeInput): StrokeHistory {
  const points = simplifyPoints(input.points);
  if (points.length < 2) {
    return history;
  }
  if (!canAcceptStroke(history, points.length / 2)) {
    return history;
  }
  const size = Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, Math.round(input.size)));
  const stroke: Stroke = { id: history.nextId, tool: input.tool, size, points };
  return {
    strokes: [...history.strokes, stroke],
    redo: [],
    version: history.version + 1,
    nextId: history.nextId + 1,
  };
}

export function undo(history: StrokeHistory): StrokeHistory {
  if (history.strokes.length === 0) {
    return history;
  }
  const last = history.strokes[history.strokes.length - 1];
  const redo = [...history.redo, last].slice(-MAX_REDO_DEPTH);
  return { ...history, strokes: history.strokes.slice(0, -1), redo, version: history.version + 1 };
}

export function redo(history: StrokeHistory): StrokeHistory {
  if (history.redo.length === 0) {
    return history;
  }
  const next = history.redo[history.redo.length - 1];
  if (!canAcceptStroke(history, next.points.length / 2)) {
    return history;
  }
  return {
    ...history,
    strokes: [...history.strokes, next],
    redo: history.redo.slice(0, -1),
    version: history.version + 1,
  };
}

export function clearHistory(history: StrokeHistory): StrokeHistory {
  if (history.strokes.length === 0 && history.redo.length === 0) {
    return history;
  }
  return { ...history, strokes: [], redo: [], version: history.version + 1 };
}

/** True when at least one brush stroke exists; erasing alone on an empty paper is not ink. */
export function hasInk(strokes: readonly Stroke[]): boolean {
  return strokes.some((stroke) => stroke.tool === 'brush');
}

export function toSnapshot(history: StrokeHistory): SketchSnapshot {
  return { version: history.version, strokes: history.strokes };
}

export function canUndo(history: StrokeHistory): boolean {
  return history.strokes.length > 0;
}

export function canRedo(history: StrokeHistory): boolean {
  return history.redo.length > 0;
}
