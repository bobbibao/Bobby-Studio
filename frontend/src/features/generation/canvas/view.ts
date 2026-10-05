import type { Rect, Size2D } from './types';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.25;
const VISIBLE_MARGIN = 32;

/** Zoom factor relative to the "fit" rectangle and pan offset in CSS pixels from the viewport center. */
export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export const FIT_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Largest rectangle with the given aspect ratio that fits the viewport, centered, inside `padding`. */
export function fitRect(viewport: Size2D, aspect: number, padding = 12): Rect {
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  let width = availableWidth;
  let height = width / aspect;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspect;
  }
  return { x: (viewport.width - width) / 2, y: (viewport.height - height) / 2, width, height };
}

export function clampView(view: ViewState, viewport: Size2D, aspect: number, padding = 12): ViewState {
  const zoom = clampZoom(view.zoom);
  const base = fitRect(viewport, aspect, padding);
  const limitX = Math.max(0, (base.width * zoom + viewport.width) / 2 - VISIBLE_MARGIN);
  const limitY = Math.max(0, (base.height * zoom + viewport.height) / 2 - VISIBLE_MARGIN);
  return {
    zoom,
    panX: Math.min(limitX, Math.max(-limitX, view.panX)),
    panY: Math.min(limitY, Math.max(-limitY, view.panY)),
  };
}

/** The paper rectangle in viewport CSS pixels for a view state. */
export function paperRect(viewport: Size2D, aspect: number, view: ViewState, padding = 12): Rect {
  const base = fitRect(viewport, aspect, padding);
  const width = base.width * view.zoom;
  const height = base.height * view.zoom;
  const centerX = viewport.width / 2 + view.panX;
  const centerY = viewport.height / 2 + view.panY;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

/** Zoom while keeping the viewport point under `anchor` fixed. */
export function zoomAt(
  view: ViewState,
  nextZoom: number,
  anchor: { x: number; y: number },
  viewport: Size2D,
  aspect: number,
  padding = 12
): ViewState {
  const zoom = clampZoom(nextZoom);
  if (zoom === view.zoom) {
    return view;
  }
  const ratio = zoom / view.zoom;
  const centerX = viewport.width / 2 + view.panX;
  const centerY = viewport.height / 2 + view.panY;
  const nextCenterX = anchor.x + (centerX - anchor.x) * ratio;
  const nextCenterY = anchor.y + (centerY - anchor.y) * ratio;
  return clampView(
    { zoom, panX: nextCenterX - viewport.width / 2, panY: nextCenterY - viewport.height / 2 },
    viewport,
    aspect,
    padding
  );
}

/** Viewport CSS pixel -> normalized paper coordinate (not clamped). */
export function toNormalized(point: { x: number; y: number }, rect: Rect): { x: number; y: number } {
  return { x: (point.x - rect.x) / rect.width, y: (point.y - rect.y) / rect.height };
}
