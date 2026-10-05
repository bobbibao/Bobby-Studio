import { cleanup, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installCanvasStub, installDomStubs } from '../test/dom';
import { renderStudio } from '../test/render';
import { SketchCanvas, type SketchCanvasProps } from './SketchCanvas';

function setup(overrides: Partial<SketchCanvasProps> = {}) {
  const props: SketchCanvasProps = {
    strokes: [],
    aspect: 1,
    canUndo: true,
    canRedo: true,
    limitReached: false,
    onStroke: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onClear: vi.fn(),
    onDrawingChange: vi.fn(),
    ...overrides,
  };
  renderStudio(
    <div>
      <textarea aria-label="notes" />
      <SketchCanvas {...props} />
    </div>
  );
  return { props, canvas: screen.getByTestId('sketch-canvas') };
}

const down = (canvas: Element, x = 100, y = 100, pointerId = 1) =>
  fireEvent.pointerDown(canvas, { pointerId, clientX: x, clientY: y, button: 0, pointerType: 'mouse' });
const move = (canvas: Element, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerMove(canvas, { pointerId, clientX: x, clientY: y, pointerType: 'mouse' });

let stub: ReturnType<typeof installCanvasStub>;

beforeEach(() => {
  installDomStubs();
  stub = installCanvasStub();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SketchCanvas stroke commit', () => {
  it('paints locally while moving but commits nothing and exports nothing until the pointer is released', () => {
    const { props, canvas } = setup();
    down(canvas, 100, 100);
    for (let i = 1; i <= 25; i += 1) {
      move(canvas, 100 + i * 5, 100 + i * 3);
    }
    expect(props.onStroke).not.toHaveBeenCalled();
    expect(stub.toBlob).not.toHaveBeenCalled();
    expect(stub.toDataURL).not.toHaveBeenCalled();
    expect(stub.calls.filter((call) => call === 'stroke').length).toBeGreaterThan(0); // live local feedback
    expect(props.onDrawingChange).toHaveBeenCalledTimes(1);
    expect(props.onDrawingChange).toHaveBeenLastCalledWith(true);

    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 230, clientY: 175 });
    expect(props.onStroke).toHaveBeenCalledTimes(1);
    const stroke = vi.mocked(props.onStroke).mock.calls[0][0];
    expect(stroke.tool).toBe('brush');
    expect(stroke.points.length).toBeGreaterThanOrEqual(4);
    expect(stroke.points.every((value) => value >= -0.05 && value <= 1.05)).toBe(true); // normalized
    expect(props.onDrawingChange).toHaveBeenLastCalledWith(false);
    expect(stub.toBlob).not.toHaveBeenCalled();
  });

  it('commits on pointercancel', () => {
    const { props, canvas } = setup();
    down(canvas);
    move(canvas, 150, 150);
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    expect(props.onStroke).toHaveBeenCalledTimes(1);
    expect(props.onDrawingChange).toHaveBeenLastCalledWith(false);
  });

  it('commits on lostpointercapture, exactly once even when pointerup also arrives', () => {
    const { props, canvas } = setup();
    down(canvas);
    move(canvas, 140, 160);
    fireEvent.lostPointerCapture(canvas, { pointerId: 1 });
    expect(props.onStroke).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(props.onStroke).toHaveBeenCalledTimes(1);
  });

  it('records a tap as a dot stroke and ignores a second pointer while drawing', () => {
    const { props, canvas } = setup();
    down(canvas, 200, 200, 1);
    down(canvas, 50, 50, 2);
    fireEvent.pointerUp(canvas, { pointerId: 2 });
    expect(props.onStroke).not.toHaveBeenCalled();
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(props.onStroke).toHaveBeenCalledTimes(1);
  });

  it('releases the drawing gate if the canvas unmounts mid-stroke', () => {
    const { props, canvas } = setup();
    down(canvas);
    cleanup();
    expect(props.onDrawingChange).toHaveBeenLastCalledWith(false);
    expect(props.onStroke).not.toHaveBeenCalled();
  });
});

describe('SketchCanvas with a re-rendering parent', () => {
  it('does not lose the stroke when the parent re-renders mid-stroke with new callback identities', () => {
    const onStroke = vi.fn();
    const seen: boolean[] = [];
    function Parent() {
      const [drawing, setDrawing] = useState(false);
      return (
        <div data-drawing={drawing}>
          <SketchCanvas
            strokes={[]}
            aspect={1}
            canUndo={false}
            canRedo={false}
            limitReached={false}
            onStroke={(stroke) => onStroke(stroke)}
            onUndo={() => undefined}
            onRedo={() => undefined}
            onClear={() => undefined}
            onDrawingChange={(active) => {
              seen.push(active);
              setDrawing(active); // changes the parent's state, so it re-renders with fresh callbacks
            }}
          />
        </div>
      );
    }
    renderStudio(<Parent />);
    const canvas = screen.getByTestId('sketch-canvas');
    down(canvas, 100, 100);
    move(canvas, 140, 140);
    move(canvas, 180, 150);
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onStroke).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onStroke).mock.calls[0][0].points.length).toBeGreaterThanOrEqual(6);
    expect(seen).toEqual([true, false]);
  });
});

describe('SketchCanvas keyboard', () => {
  it('Ctrl/Cmd+Z undoes and Shift+Z redoes on the focused canvas', () => {
    const { props } = setup();
    const surface = screen.getByRole('group', { name: 'Sketch canvas' });
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'z', metaKey: true });
    expect(props.onUndo).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(surface, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(props.onRedo).toHaveBeenCalledTimes(1);
  });

  it('never intercepts undo while the user edits a textarea', () => {
    const { props } = setup();
    const notes = screen.getByLabelText('notes');
    const notPrevented = fireEvent.keyDown(notes, { key: 'z', ctrlKey: true });
    expect(notPrevented).toBe(true);
    expect(props.onUndo).not.toHaveBeenCalled();
  });

  it('Escape leaves a temporary tool and never clears content', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pan' }));
    expect(screen.getByRole('button', { name: 'Pan' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(screen.getByRole('group', { name: 'Sketch canvas' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Brush' }).getAttribute('aria-pressed')).toBe('true');
    expect(props.onClear).not.toHaveBeenCalled();
  });

  it('clearing asks for confirmation first', async () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear sketch' }));
    expect(props.onClear).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear sketch' }).pop() as HTMLElement);
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });
});
