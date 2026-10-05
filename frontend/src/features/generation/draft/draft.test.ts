import { describe, expect, it } from 'vitest';
import { TEST_MODEL } from '../scheduler/testing';
import { createDraftStore, createInitialDraft, reduceDraft, toStudioInput, type ReferenceDraft } from './draftState';
import {
  MAX_DRAFTS_PER_USER,
  clearUserDrafts,
  createDraftWriter,
  fromStoredDraft,
  loadDraft,
  parseStoredDraft,
  readStoredSession,
  saveDraft,
  toStoredDraft,
  writeStoredSession,
  type KeyValueStore,
} from './storage';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const reference = (key: string): ReferenceDraft => ({
  key,
  status: 'uploading',
  assetId: null,
  name: `${key}.png`,
  mimeType: 'image/png',
  byteSize: 1000,
  width: null,
  height: null,
  previewUrl: `blob:${key}`,
});

describe('draft reducer', () => {
  it('drops an upload completion for a replaced or removed reference', () => {
    let state = createInitialDraft();
    state = reduceDraft(state, { type: 'referencePicked', reference: reference('a') });
    state = reduceDraft(state, { type: 'referencePicked', reference: reference('b') });
    const stale = reduceDraft(state, { type: 'referenceUploaded', key: 'a', assetId: 'asset-a', width: 1, height: 1 });
    expect(stale).toBe(state);
    const fresh = reduceDraft(state, { type: 'referenceUploaded', key: 'b', assetId: 'asset-b', width: 1, height: 1 });
    expect(fresh.reference?.assetId).toBe('asset-b');
    const removed = reduceDraft(fresh, { type: 'referenceRemoved' });
    expect(reduceDraft(removed, { type: 'referenceUploaded', key: 'b', assetId: 'late', width: 1, height: 1 })).toBe(removed);
  });

  it('picking a reference switches to Reference mode in the same commit', () => {
    const state = reduceDraft(createInitialDraft(), { type: 'referencePicked', reference: reference('a') });
    expect(state.mode).toBe('reference');
    expect(toStudioInput(state).reference).toMatchObject({ key: 'a', assetId: null });
  });

  it('adapts size and quality to the selected model and ignores no-ops', () => {
    let state = createInitialDraft({ size: { width: 512, height: 512 }, quality: 'standard' });
    state = reduceDraft(state, { type: 'model', model: { ...TEST_MODEL, capabilities: { ...TEST_MODEL.capabilities, qualities: ['preview'] } } });
    expect(state.size).toEqual({ width: 1024, height: 1024 });
    expect(state.quality).toBe('preview');
    expect(reduceDraft(state, { type: 'prompt', value: state.prompt })).toBe(state);
  });

  it('notifies subscribers synchronously only for real changes', () => {
    const store = createDraftStore(createInitialDraft());
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.dispatch({ type: 'prompt', value: 'hello' });
    store.dispatch({ type: 'prompt', value: 'hello' });
    store.dispatch({ type: 'stroke', stroke: { tool: 'brush', size: 8, points: [0.1, 0.1, 0.3, 0.3] } });
    expect(calls).toBe(2);
    expect(toStudioInput(store.getState()).sketch.version).toBe(1);
  });
});

describe('draft persistence', () => {
  const draft = () =>
    reduceDraft(
      reduceDraft(createInitialDraft({ modelId: TEST_MODEL.id, size: { width: 1024, height: 1024 } }), { type: 'prompt', value: 'a pavilion' }),
      { type: 'stroke', stroke: { tool: 'brush', size: 8, points: [0.1, 0.1, 0.5, 0.5] } }
    );

  it('round-trips prompt, model, size and compact strokes, but never base64 or object URLs', () => {
    const store = memoryStore();
    const state = reduceDraft(draft(), { type: 'referencePicked', reference: { ...reference('r'), status: 'ready', assetId: 'asset-r' } });
    expect(saveDraft(store, 'user-a', 'session-1', toStoredDraft(state, 1000))).toBe(true);
    const raw = [...store.map.values()].join('');
    expect(raw).not.toContain('data:');
    expect(raw).not.toContain('blob:');
    const restored = fromStoredDraft(loadDraft(store, 'user-a', 'session-1') ?? (() => { throw new Error('missing draft'); })());
    expect(restored.prompt).toBe('a pavilion');
    expect(restored.history.strokes).toHaveLength(1);
    expect(restored.reference).toMatchObject({ assetId: 'asset-r', previewUrl: null, status: 'ready' });
  });

  it('does not persist an upload that is still in flight', () => {
    const state = reduceDraft(draft(), { type: 'referencePicked', reference: reference('r') });
    expect(toStoredDraft(state, 1).reference).toBeNull();
  });

  it('scopes drafts by user and session so users never mix', () => {
    const store = memoryStore();
    saveDraft(store, 'user-a', 'session-1', toStoredDraft(draft(), 1000));
    expect(loadDraft(store, 'user-b', 'session-1')).toBeNull();
    expect(loadDraft(store, 'user-a', 'session-2')).toBeNull();
    expect(loadDraft(store, 'user-a', 'session-1')?.prompt).toBe('a pavilion');
    clearUserDrafts(store, 'user-a');
    expect(loadDraft(store, 'user-a', 'session-1')).toBeNull();
  });

  it('version-checks saves: an older asynchronous write never overwrites a newer draft', () => {
    const store = memoryStore();
    const older = toStoredDraft(draft(), 1000);
    const newer = { ...toStoredDraft(draft(), 2000), version: older.version + 5, prompt: 'newer' };
    expect(saveDraft(store, 'u', 's', newer)).toBe(true);
    expect(saveDraft(store, 'u', 's', older)).toBe(false);
    expect(loadDraft(store, 'u', 's')?.prompt).toBe('newer');
  });

  it('coalesces rapid edits in the writer and writes only the latest state', async () => {
    const store = memoryStore();
    const writer = createDraftWriter(store, 'u', 's', { delayMs: 10 });
    let state = createInitialDraft();
    for (const value of ['a', 'ab', 'abc']) {
      state = reduceDraft(state, { type: 'prompt', value });
      writer.schedule(state);
    }
    expect(loadDraft(store, 'u', 's')).toBeNull();
    writer.flush();
    expect(loadDraft(store, 'u', 's')?.prompt).toBe('abc');
  });

  it('bounds the number of drafts per user and discards malformed or unknown-version data', () => {
    const store = memoryStore();
    for (let i = 0; i < MAX_DRAFTS_PER_USER + 3; i += 1) {
      saveDraft(store, 'u', `s${i}`, toStoredDraft(draft(), 1000 + i));
    }
    const kept = Array.from({ length: MAX_DRAFTS_PER_USER + 3 }, (_, i) => loadDraft(store, 'u', `s${i}`)).filter(Boolean);
    expect(kept).toHaveLength(MAX_DRAFTS_PER_USER);
    expect(parseStoredDraft({ v: 99 })).toBeNull();
    expect(parseStoredDraft('nope')).toBeNull();
    store.setItem('bobby.studio.draft.v1.u.bad', '{not json');
    expect(loadDraft(store, 'u', 'bad')).toBeNull();
    const hostile = parseStoredDraft({ v: 1, savedAt: 1, version: 1, prompt: 'x'.repeat(9000), strokes: [{ tool: 'brush', size: 9999, points: [5, -5, 0.2, 0.2] }, { tool: 'pen', points: [] }] });
    expect(hostile?.prompt).toHaveLength(4000);
    expect(hostile?.strokes).toHaveLength(1);
    expect(hostile?.strokes[0].size).toBeLessThanOrEqual(96);
    expect(hostile?.strokes[0].points).toEqual([1, 0, 0.2, 0.2]);
  });

  it('survives a storage that throws', () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadDraft(blocked, 'u', 's')).toBeNull();
    expect(saveDraft(blocked, 'u', 's', toStoredDraft(draft(), 1))).toBe(false);
    expect(readStoredSession(blocked, 'u')).toBeNull();
  });

  it('keeps the tab session pointer per user', () => {
    const store = memoryStore();
    writeStoredSession(store, 'user-a', { sessionId: 's1', latestRevision: 4, jobs: [{ id: 'j1', prompt: 'p' }] });
    expect(readStoredSession(store, 'user-a')).toMatchObject({ sessionId: 's1', latestRevision: 4 });
    expect(readStoredSession(store, 'user-b')).toBeNull();
  });
});
