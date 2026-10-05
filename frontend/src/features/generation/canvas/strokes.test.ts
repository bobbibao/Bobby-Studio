import { describe, expect, it } from 'vitest';
import {
  MAX_REDO_DEPTH,
  MAX_STROKES,
  MAX_TOTAL_POINTS,
  canAcceptStroke,
  clearHistory,
  commitStroke,
  createHistory,
  hasInk,
  redo,
  simplifyPoints,
  undo,
} from './strokes';
import { exportDimensions } from './export';
import { FIT_VIEW, clampView, fitRect, paperRect, toNormalized, zoomAt } from './view';

const line = (x = 0.1) => ({ tool: 'brush' as const, size: 8, points: [x, 0.1, x + 0.2, 0.3] });

describe('stroke history', () => {
  it('commits normalized, quantized strokes and bumps the version once per change', () => {
    const history = commitStroke(createHistory(), { tool: 'brush', size: 8, points: [0.123456, 0.5, 1.4, -0.2] });
    expect(history.strokes).toHaveLength(1);
    expect(history.strokes[0].points).toEqual([0.1235, 0.5, 1, 0]);
    expect(history.version).toBe(1);
  });

  it('ignores an empty stroke and returns the same history object', () => {
    const history = createHistory();
    expect(commitStroke(history, { tool: 'brush', size: 8, points: [0.5] })).toBe(history);
  });

  it('undo and redo are bounded and no-ops at the ends', () => {
    let history = createHistory();
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
    history = commitStroke(history, line(0.1));
    history = commitStroke(history, line(0.3));
    const undone = undo(history);
    expect(undone.strokes).toHaveLength(1);
    expect(undone.redo).toHaveLength(1);
    expect(undone.version).toBeGreaterThan(history.version);
    const redone = redo(undone);
    expect(redone.strokes).toHaveLength(2);
    expect(redo(redone)).toBe(redone);
    // a new stroke after undo drops the redo branch
    expect(commitStroke(undone, line(0.5)).redo).toHaveLength(0);
  });

  it('bounds the number of strokes, total points and redo depth', () => {
    let history = createHistory();
    for (let i = 0; i < MAX_STROKES + 25; i += 1) {
      history = commitStroke(history, line(0.01 + (i % 50) * 0.01));
    }
    expect(history.strokes).toHaveLength(MAX_STROKES);
    expect(canAcceptStroke(history, 1)).toBe(false);

    const dense = Array.from({ length: 1990 }, (_, i) => [(i % 100) / 100, Math.floor(i / 100) / 20]).flat();
    let heavy = createHistory();
    for (let i = 0; i < 30; i += 1) {
      heavy = commitStroke(heavy, { tool: 'brush', size: 4, points: dense.map((value, index) => (index % 2 === 0 ? value : value + i * 0.0001)) });
    }
    const points = heavy.strokes.reduce((sum, stroke) => sum + stroke.points.length / 2, 0);
    expect(points).toBeLessThanOrEqual(MAX_TOTAL_POINTS);

    let deep = createHistory();
    for (let i = 0; i < MAX_REDO_DEPTH + 20; i += 1) {
      deep = commitStroke(deep, line(0.01 + (i % 50) * 0.01));
    }
    for (let i = 0; i < MAX_REDO_DEPTH + 20; i += 1) {
      deep = undo(deep);
    }
    expect(deep.redo.length).toBe(MAX_REDO_DEPTH);
  });

  it('clear empties strokes and redo and counts as a change only when something existed', () => {
    const empty = createHistory();
    expect(clearHistory(empty)).toBe(empty);
    const history = commitStroke(empty, line());
    const cleared = clearHistory(history);
    expect(cleared.strokes).toHaveLength(0);
    expect(cleared.version).toBeGreaterThan(history.version);
  });

  it('treats eraser-only paper as having no ink', () => {
    const history = commitStroke(createHistory(), { tool: 'eraser', size: 20, points: [0.1, 0.1, 0.4, 0.4] });
    expect(hasInk(history.strokes)).toBe(false);
    expect(hasInk(commitStroke(history, line()).strokes)).toBe(true);
  });

  it('thins near-duplicate points but keeps the last point', () => {
    const points = simplifyPoints([0.1, 0.1, 0.1001, 0.1001, 0.1002, 0.1002, 0.5, 0.5]);
    expect(points).toEqual([0.1, 0.1, 0.5, 0.5]);
    expect(simplifyPoints([0.2, 0.2, 0.2001, 0.2001])).toEqual([0.2, 0.2, 0.2001, 0.2001]);
  });
});

describe('view math and export bounds', () => {
  it('fits a paper of any aspect inside the viewport and normalizes pointer positions', () => {
    const viewport = { width: 600, height: 400 };
    const rect = fitRect(viewport, 1, 0);
    expect(rect).toEqual({ x: 100, y: 0, width: 400, height: 400 });
    expect(toNormalized({ x: 300, y: 200 }, rect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const viewport = { width: 600, height: 400 };
    const anchor = { x: 450, y: 120 };
    const before = paperRect(viewport, 1, FIT_VIEW);
    const normalized = toNormalized(anchor, before);
    const zoomed = zoomAt(FIT_VIEW, 2.5, anchor, viewport, 1);
    const after = paperRect(viewport, 1, zoomed);
    const check = toNormalized(anchor, after);
    expect(check.x).toBeCloseTo(normalized.x, 5);
    expect(check.y).toBeCloseTo(normalized.y, 5);
    expect(zoomed.zoom).toBe(2.5);
    expect(zoomAt(FIT_VIEW, 100, anchor, viewport, 1).zoom).toBe(8);
    expect(clampView({ zoom: 0.2, panX: 9999, panY: -9999 }, viewport, 1).zoom).toBe(1);
  });

  it('bounds exported pixels regardless of the requested size', () => {
    expect(exportDimensions({ width: 1024, height: 1024 })).toEqual({ width: 1024, height: 1024 });
    expect(exportDimensions({ width: 8192, height: 4096 })).toEqual({ width: 2048, height: 1024 });
  });
});
