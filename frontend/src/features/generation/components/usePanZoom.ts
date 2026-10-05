import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { FIT_VIEW, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, clampView, paperRect, zoomAt, type ViewState } from '../canvas/view';
import type { Rect, Size2D } from '../canvas/types';

export interface PanZoom {
  viewportRef: RefObject<HTMLDivElement>;
  viewport: Size2D;
  view: ViewState;
  rect: Rect;
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  /** Starts a drag-pan from a pointer event; returns handlers' companion functions. */
  beginPan(event: ReactPointerEvent<HTMLElement>): void;
  movePan(event: ReactPointerEvent<HTMLElement>): void;
  endPan(event: ReactPointerEvent<HTMLElement>): void;
  panning: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * Fit/zoom/pan for a paper rectangle with a fixed aspect inside a measured viewport. Shared by the sketch
 * canvas and the result viewer so both behave the same.
 */
export function usePanZoom(aspect: number): PanZoom {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Size2D>({ width: 0, height: 0 });
  const [view, setView] = useState<ViewState>(FIT_VIEW);
  const [panning, setPanning] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: ViewState } | null>(null);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return undefined;
    }
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      setViewport((current) =>
        current.width === bounds.width && current.height === bounds.height ? current : { width: bounds.width, height: bounds.height }
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A different aspect ratio is a different paper: start from "fit" again.
  useEffect(() => {
    setView(FIT_VIEW);
  }, [aspect]);

  const centerAnchor = useCallback(() => ({ x: viewport.width / 2, y: viewport.height / 2 }), [viewport]);

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) => {
      setView((current) => zoomAt(current, current.zoom * factor, anchor ?? centerAnchor(), viewport, aspect));
    },
    [aspect, centerAnchor, viewport]
  );

  // Ctrl/Cmd + wheel zooms at the pointer; a native non-passive listener lets us stop page zoom/scroll.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return undefined;
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const beginPan = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: view };
      setPanning(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // capture can fail for synthetic or already-released pointers; panning still works while over the element
      }
    },
    [view]
  );
  const movePan = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      setView(
        clampView(
          { zoom: drag.origin.zoom, panX: drag.origin.panX + (event.clientX - drag.startX), panY: drag.origin.panY + (event.clientY - drag.startY) },
          viewport,
          aspect
        )
      );
    },
    [aspect, viewport]
  );
  const endPan = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
      dragRef.current = null;
      setPanning(false);
    }
  }, []);

  const rect = paperRect(viewport, aspect, view);
  return {
    viewportRef,
    viewport,
    view,
    rect,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    fit: () => setView(FIT_VIEW),
    beginPan,
    movePan,
    endPan,
    panning,
    canZoomIn: view.zoom < MAX_ZOOM,
    canZoomOut: view.zoom > MIN_ZOOM,
  };
}
