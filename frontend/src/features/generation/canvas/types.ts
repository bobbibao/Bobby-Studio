export type StrokeTool = 'brush' | 'eraser';

/**
 * One committed stroke. Coordinates are normalized to the sketch paper (0..1 on both axes) and stored flat
 * as [x0, y0, x1, y1, ...] so the history stays compact in memory and in drafts. `size` is expressed in
 * 1024-px-wide reference units, so a stroke keeps its relative thickness at any display or export size.
 */
export interface Stroke {
  readonly id: number;
  readonly tool: StrokeTool;
  readonly size: number;
  readonly points: readonly number[];
}

export interface StrokeInput {
  tool: StrokeTool;
  size: number;
  points: readonly number[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size2D {
  width: number;
  height: number;
}

/** Immutable view of the sketch handed to the scheduler: `version` identifies the committed content. */
export interface SketchSnapshot {
  readonly version: number;
  readonly strokes: readonly Stroke[];
}

export const BRUSH_REFERENCE_WIDTH = 1024;
export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 96;
export const DEFAULT_BRUSH_SIZE = 8;
export const DEFAULT_ERASER_SIZE = 32;
export const INK_COLOR = '#171717';
export const PAPER_COLOR = '#ffffff';
