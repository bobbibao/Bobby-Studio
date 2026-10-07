import { vi } from 'vitest';

/** Test-only DOM stubs for APIs jsdom does not provide. */

export class FakePointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? true;
  }
}

export interface Viewport {
  width: number;
  height: number;
}

/** Makes every element measure `viewport` and reports it through ResizeObserver. */
export function installDomStubs(options: { width?: number; viewport?: Viewport } = {}) {
  const viewport = options.viewport ?? { width: 400, height: 400 };
  const width = options.width ?? 1440;
  Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: FakePointerEvent });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      return {
        matches: min ? width >= Number(min[1]) : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      };
    },
  });
  class FakeResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      this.callback([], this);
    }
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: FakeResizeObserver });
  class FakeIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: FakeIntersectionObserver });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
    width: viewport.width,
    height: viewport.height,
    toJSON: () => ({}),
  }));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
  Element.prototype.scrollIntoView = vi.fn();
}

/** Replaces canvas getContext with a recording stub and returns the toBlob/toDataURL spies. */
export function installCanvasStub() {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
  };
  const context: Partial<CanvasRenderingContext2D> = {
    setTransform: record('setTransform'),
    clearRect: record('clearRect'),
    fillRect: record('fillRect'),
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    rect: record('rect'),
    clip: record('clip'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    arc: record('arc'),
    fill: record('fill'),
    drawImage: record('drawImage'),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1, colorSpace: 'srgb' }),
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    strokeStyle: '#000',
    fillStyle: '#000',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as CanvasRenderingContext2D);
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => undefined);
  const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:');
  return { calls, toBlob, toDataURL };
}
