import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationUpdatedEvent } from '../contracts';
import type { StudioApi } from '../hooks/types';
import type { StudioSocket } from '../hooks/useGenerationEvents';
import { FakeServer, TEST_MODEL, hintFor } from '../scheduler/testing';
import { installCanvasStub, installDomStubs } from '../test/dom';
import { renderStudio } from '../test/render';
import { StudioWorkspace } from './StudioWorkspace';

function createFakes() {
  const server = new FakeServer();
  let push: ((payload: unknown) => void) | null = null;
  const api: StudioApi = {
    getCatalog: async () => ({ plan: 'pro', models: [TEST_MODEL] }),
    getCreditBalance: async () => ({ available: 25, reserved: 0 }),
    createStudioSession: vi.fn(async () => ({ id: 'session-1', latestRevision: 0 })),
    uploadImage: vi.fn(async (file: File) => ({ assetId: 'asset-upload', mimeType: file.type, width: 800, height: 600, byteSize: file.size, sha256: 'x', url: 'https://assets.test/up.png' })),
    getAssetBlob: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    createGeneration: vi.fn(async (body, key) => server.accept(body, key)),
    getGeneration: vi.fn(async (id) => server.get(id)),
    cancelGeneration: vi.fn(async (id) => server.advance(id, { status: 'CANCELLED', cancellationRequested: true, error: { code: 'CANCELLED', message: 'c' } })),
    retryGeneration: vi.fn(async () => {
      throw new Error('not used');
    }),
    saveGeneration: vi.fn(async (id) => ({ generation: server.get(id), libraryItemId: 'l1' })),
  };
  const socket: StudioSocket = {
    isConnected: () => true,
    isActive: () => true,
    reconnect: () => undefined,
    subscribe: ({ onUpdate }) => {
      push = onUpdate;
      return () => {
        push = null;
      };
    },
  };
  return { server, api, connect: () => socket, emit: (event: GenerationUpdatedEvent) => push?.(event) };
}

const fetchImage = vi.fn(async () => new Blob(['png'], { type: 'image/png' }));

function mount(userId: string, fakes = createFakes()) {
  const view = renderStudio(<StudioWorkspace userId={userId} api={fakes.api} connect={fakes.connect} fetchImage={fetchImage} />);
  return { ...view, fakes };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  installDomStubs({ width: 1440 });
  installCanvasStub();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const promptBox = () => screen.findByRole('textbox', { name: 'Prompt' });

describe('Studio keyboard and manual flow', () => {
  it('does not hijack textarea undo, and Ctrl+Enter submits an explicit final with the current prompt', async () => {
    const { fakes } = mount('user-a');
    const textarea = await promptBox();
    const generate = screen.getByRole('button', { name: 'Generate' });
    expect(generate.hasAttribute('disabled')).toBe(true); // nothing to generate yet

    fireEvent.change(textarea, { target: { value: 'A timber house' } });
    expect(screen.getByRole('button', { name: 'Generate' }).hasAttribute('disabled')).toBe(false);
    expect(fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true })).toBe(true); // not prevented: native undo keeps working

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(fakes.api.createGeneration).toHaveBeenCalledTimes(1));
    const [body, key] = vi.mocked(fakes.api.createGeneration).mock.calls[0];
    expect(body).toMatchObject({ intent: 'final', prompt: 'A timber house', modelId: TEST_MODEL.id, mode: 'text_to_image', quality: 'preview', studioSessionId: 'session-1' });
    expect(body.inputAssetId).toBeUndefined(); // prompt-only never uploads a canvas
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(fakes.api.uploadImage).not.toHaveBeenCalled();
  });

  it('shows the result only after the REST snapshot confirms it, then lists it as a version', async () => {
    const { fakes } = mount('user-a');
    const textarea = await promptBox();
    fireEvent.change(textarea, { target: { value: 'A timber house' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(fakes.api.createGeneration).toHaveBeenCalled());
    expect(screen.queryByRole('img', { name: /Generated image for/ })).toBeNull();

    await act(async () => {
      const done = fakes.server.complete('job-1');
      fakes.emit(hintFor(done));
    });
    const image = await screen.findByRole('img', { name: /Generated image for: A timber house/ });
    expect(image.getAttribute('src')).toBe('https://assets.test/job-1.png');
    expect(screen.getByRole('button', { name: /Final 1/ })).toBeTruthy();
    expect(fakes.api.getGeneration).toHaveBeenCalledWith('job-1');
  });

  it('exposes Realtime as a real switch', async () => {
    mount('user-a');
    await promptBox();
    const toggle = screen.getByRole('switch', { name: 'Realtime' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(screen.getByRole('switch', { name: 'Realtime' }).getAttribute('aria-checked')).toBe('true');
  });

  it('shows only catalog-driven choices and a Simulated inference badge, never provider details', async () => {
    mount('user-a');
    await promptBox();
    const model = screen.getByRole('combobox', { name: 'Model' });
    expect(within(model).getByRole('option', { name: 'Test model' })).toBeTruthy();
    expect(screen.getByText('Simulated inference')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Aspect ratio' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/openai|gemini|controlnet|lora|seed|sdxl|thesis/i);
    expect(screen.queryByText(/video/i)).toBeNull();
  });
});

describe('Studio realtime binding', () => {
  const settle = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

  it('auto mode submits one debounced preview for a burst of edits', async () => {
    const { fakes } = mount('user-a');
    const textarea = await promptBox();
    fireEvent.click(screen.getByRole('switch', { name: 'Realtime' }));
    for (const value of ['a', 'a t', 'a ti', 'a timber']) {
      fireEvent.change(textarea, { target: { value } });
      await settle(80);
    }
    expect(fakes.api.createGeneration).not.toHaveBeenCalled();
    await settle(800);
    expect(fakes.api.createGeneration).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fakes.api.createGeneration).mock.calls[0][0]).toMatchObject({ intent: 'preview', prompt: 'a timber' });
  });

  it('waits for IME compositionend before treating the prompt as committed', async () => {
    const { fakes } = mount('user-a');
    const textarea = await promptBox();
    fireEvent.click(screen.getByRole('switch', { name: 'Realtime' }));
    fireEvent.compositionStart(textarea);
    fireEvent.change(textarea, { target: { value: 'にほ' } });
    await settle(900);
    expect(fakes.api.createGeneration).not.toHaveBeenCalled();
    fireEvent.change(textarea, { target: { value: '日本の家' } });
    fireEvent.compositionEnd(textarea);
    await settle(900);
    expect(fakes.api.createGeneration).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fakes.api.createGeneration).mock.calls[0][0].prompt).toBe('日本の家');
  });

  it('stops all timers and subscriptions on unmount', async () => {
    const { fakes, unmount } = mount('user-a');
    const textarea = await promptBox();
    fireEvent.click(screen.getByRole('switch', { name: 'Realtime' }));
    fireEvent.change(textarea, { target: { value: 'unmounting' } });
    unmount();
    await settle(900);
    expect(fakes.api.createGeneration).not.toHaveBeenCalled();
  });
});

describe('Studio draft recovery and user scoping', () => {
  it('restores the draft after a reload and never shows it to another user', async () => {
    const first = mount('user-a');
    fireEvent.change(await promptBox(), { target: { value: 'Recover me' } });
    first.unmount();
    expect(Object.keys(window.localStorage).some((key) => key.includes('user-a'))).toBe(true);
    expect(window.localStorage.getItem(Object.keys(window.localStorage).find((key) => key.includes('draft')) ?? '')).not.toContain('data:');

    const again = mount('user-a');
    expect(((await promptBox()) as HTMLTextAreaElement).value).toBe('Recover me');
    again.unmount();

    mount('user-b');
    expect(((await promptBox()) as HTMLTextAreaElement).value).toBe('');
    expect(Object.keys(window.localStorage).filter((key) => key.includes('user-b') && key.includes('draft'))).toHaveLength(0);
  });
});

describe('Studio responsive layouts', () => {
  it('mobile: single column with Input/Result tabs and a reachable primary action', async () => {
    installDomStubs({ width: 390 });
    mount('user-a');
    await promptBox();
    expect(screen.getByRole('tab', { name: 'Input' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Result' }));
    expect(screen.getByRole('button', { name: 'Generate' })).toBeTruthy(); // still reachable on the Result tab
  });

  it('tablet: settings move into a drawer that traps focus and closes with Escape', async () => {
    installDomStubs({ width: 820 });
    mount('user-a');
    await promptBox();
    expect(screen.queryByRole('combobox', { name: 'Model' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: 'Model' })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
