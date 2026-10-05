import {
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  MAX_TOTAL_POINTS,
  createHistory,
} from '../canvas/strokes';
import { MAX_BRUSH_SIZE, MIN_BRUSH_SIZE, type Stroke } from '../canvas/types';
import { GENERATION_QUALITIES, type GenerationQuality, type GenerationSize } from '../contracts';
import { MAX_PROMPT_CHARS } from '../scheduler/input';
import type { StudioMode } from '../scheduler/types';
import { createInitialDraft, type DraftState } from './draftState';

/** The minimal Storage surface used here, so tests can inject a fake and a blocked store can throw. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DRAFT_VERSION = 1;
export const MAX_DRAFTS_PER_USER = 5;
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const MAX_DRAFT_BYTES = 400_000;
export const MAX_STORED_JOBS = 12;

export interface StoredReference {
  assetId: string;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
}

/** Everything persisted for a draft. Strokes are compact vector data; the reference is only an owned asset id. */
export interface StoredDraft {
  v: typeof DRAFT_VERSION;
  savedAt: number;
  version: number;
  prompt: string;
  mode: StudioMode;
  modelId: string | null;
  size: GenerationSize | null;
  quality: GenerationQuality;
  auto: boolean;
  strokes: Stroke[];
  reference: StoredReference | null;
}

const draftKey = (userId: string, sessionId: string) => `bobby.studio.draft.v${DRAFT_VERSION}.${userId}.${sessionId}`;
const indexKey = (userId: string) => `bobby.studio.drafts.v${DRAFT_VERSION}.${userId}`;
const sessionKey = (userId: string) => `bobby.studio.session.v1.${userId}`;

// ------------------------------------------------------------------ validation helpers

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';

function parseSize(value: unknown): GenerationSize | null {
  if (isRecord(value) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && value.width > 0 && value.height > 0) {
    return { width: value.width, height: value.height };
  }
  return null;
}

function parseStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const strokes: Stroke[] = [];
  let points = 0;
  for (const item of value.slice(0, MAX_STROKES)) {
    if (!isRecord(item) || !Array.isArray(item.points) || (item.tool !== 'brush' && item.tool !== 'eraser')) {
      continue;
    }
    const raw = item.points;
    if (raw.length < 2 || raw.length % 2 !== 0 || raw.length > MAX_POINTS_PER_STROKE * 2 || !raw.every(isFiniteNumber)) {
      continue;
    }
    if (points + raw.length / 2 > MAX_TOTAL_POINTS) {
      break;
    }
    points += raw.length / 2;
    const size = isFiniteNumber(item.size) ? Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, item.size)) : MIN_BRUSH_SIZE;
    strokes.push({
      id: isFiniteNumber(item.id) ? item.id : strokes.length + 1,
      tool: item.tool,
      size,
      points: raw.map((coordinate) => Math.min(1, Math.max(0, coordinate))),
    });
  }
  return strokes;
}

/** Validates untrusted persisted data; anything malformed or unknown-version is discarded. */
export function parseStoredDraft(raw: unknown): StoredDraft | null {
  if (!isRecord(raw) || raw.v !== DRAFT_VERSION) {
    return null;
  }
  if (!isFiniteNumber(raw.savedAt) || !isFiniteNumber(raw.version) || !isString(raw.prompt)) {
    return null;
  }
  const mode = raw.mode === 'sketch' || raw.mode === 'reference' ? raw.mode : 'prompt';
  const quality = GENERATION_QUALITIES.find((candidate) => candidate === raw.quality) ?? 'preview';
  let reference: StoredReference | null = null;
  if (isRecord(raw.reference) && isString(raw.reference.assetId) && raw.reference.assetId.length > 0) {
    reference = {
      assetId: raw.reference.assetId,
      name: isString(raw.reference.name) ? raw.reference.name.slice(0, 200) : 'reference',
      mimeType: isString(raw.reference.mimeType) ? raw.reference.mimeType : 'image/png',
      byteSize: isFiniteNumber(raw.reference.byteSize) ? raw.reference.byteSize : 0,
      width: isFiniteNumber(raw.reference.width) ? raw.reference.width : null,
      height: isFiniteNumber(raw.reference.height) ? raw.reference.height : null,
    };
  }
  return {
    v: DRAFT_VERSION,
    savedAt: raw.savedAt,
    version: raw.version,
    prompt: raw.prompt.slice(0, MAX_PROMPT_CHARS),
    mode: mode === 'reference' && !reference ? 'prompt' : mode,
    modelId: isString(raw.modelId) ? raw.modelId : null,
    size: parseSize(raw.size),
    quality,
    auto: raw.auto === true,
    strokes: parseStrokes(raw.strokes),
    reference,
  };
}

// ------------------------------------------------------------------ mapping

/** Only owned, uploaded references persist; an in-flight or failed upload is not part of a draft. */
export function toStoredDraft(state: DraftState, now: number): StoredDraft {
  const reference = state.reference;
  return {
    v: DRAFT_VERSION,
    savedAt: now,
    version: state.version,
    prompt: state.prompt.slice(0, MAX_PROMPT_CHARS),
    mode: state.mode,
    modelId: state.modelId,
    size: state.size,
    quality: state.quality,
    auto: state.auto,
    strokes: [...state.history.strokes],
    reference:
      reference && reference.status === 'ready' && reference.assetId
        ? {
            assetId: reference.assetId,
            name: reference.name,
            mimeType: reference.mimeType,
            byteSize: reference.byteSize,
            width: reference.width,
            height: reference.height,
          }
        : null,
  };
}

export function fromStoredDraft(stored: StoredDraft): DraftState {
  return createInitialDraft({
    version: stored.version,
    prompt: stored.prompt,
    mode: stored.mode,
    modelId: stored.modelId,
    size: stored.size,
    quality: stored.quality,
    auto: stored.auto,
    history: createHistory(stored.strokes, stored.strokes.length > 0 ? 1 : 0),
    reference: stored.reference
      ? {
          key: `restored-${stored.reference.assetId}`,
          status: 'ready',
          assetId: stored.reference.assetId,
          name: stored.reference.name,
          mimeType: stored.reference.mimeType,
          byteSize: stored.reference.byteSize,
          width: stored.reference.width,
          height: stored.reference.height,
          previewUrl: null,
        }
      : null,
  });
}

// ------------------------------------------------------------------ persistence

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const text = store.getItem(key);
    return text === null ? null : (JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    const text = JSON.stringify(value);
    if (text.length > MAX_DRAFT_BYTES) {
      return false;
    }
    store.setItem(key, text);
    return true;
  } catch {
    return false; // storage unavailable, blocked or full: the app keeps working without recovery
  }
}

function removeKey(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}

interface DraftIndexEntry {
  sessionId: string;
  savedAt: number;
}

function readIndex(store: KeyValueStore, userId: string): DraftIndexEntry[] {
  const raw = readJson(store, indexKey(userId));
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (entry): entry is DraftIndexEntry => isRecord(entry) && isString(entry.sessionId) && isFiniteNumber(entry.savedAt)
  );
}

export function loadDraft(store: KeyValueStore, userId: string, sessionId: string): StoredDraft | null {
  return parseStoredDraft(readJson(store, draftKey(userId, sessionId)));
}

/**
 * Version-checked save: a write whose version is older than what is stored is ignored, so a late
 * asynchronous save can never overwrite a newer draft. Drafts are scoped by user and session and bounded
 * in count, age and size.
 */
export function saveDraft(store: KeyValueStore, userId: string, sessionId: string, draft: StoredDraft): boolean {
  const existing = loadDraft(store, userId, sessionId);
  if (existing && existing.version > draft.version) {
    return false;
  }
  if (!writeJson(store, draftKey(userId, sessionId), draft)) {
    return false;
  }
  const entries = readIndex(store, userId)
    .filter((entry) => entry.sessionId !== sessionId)
    .concat({ sessionId, savedAt: draft.savedAt })
    .sort((a, b) => b.savedAt - a.savedAt);
  const kept = entries.filter((entry, index) => index < MAX_DRAFTS_PER_USER && draft.savedAt - entry.savedAt <= DRAFT_MAX_AGE_MS);
  for (const dropped of entries.filter((entry) => !kept.includes(entry))) {
    removeKey(store, draftKey(userId, dropped.sessionId));
  }
  writeJson(store, indexKey(userId), kept);
  return true;
}

export function clearDraft(store: KeyValueStore, userId: string, sessionId: string): void {
  removeKey(store, draftKey(userId, sessionId));
  const remaining = readIndex(store, userId).filter((entry) => entry.sessionId !== sessionId);
  writeJson(store, indexKey(userId), remaining);
}

/** Removes every persisted draft of one user (logout / identity change). */
export function clearUserDrafts(store: KeyValueStore, userId: string): void {
  for (const entry of readIndex(store, userId)) {
    removeKey(store, draftKey(userId, entry.sessionId));
  }
  removeKey(store, indexKey(userId));
}

export interface DraftWriter {
  /** Coalesces rapid edits; the newest state wins. */
  schedule(state: DraftState): void;
  flush(): void;
  cancel(): void;
}

export function createDraftWriter(
  store: KeyValueStore,
  userId: string,
  sessionId: string,
  options: { delayMs?: number; now?: () => number } = {}
): DraftWriter {
  const delayMs = options.delayMs ?? 500;
  const now = options.now ?? (() => Date.now());
  let pending: DraftState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) {
      const state = pending;
      pending = null;
      saveDraft(store, userId, sessionId, toStoredDraft(state, now()));
    }
  };
  return {
    schedule(state) {
      pending = state;
      if (timer === null) {
        timer = setTimeout(flush, delayMs);
      }
    },
    flush,
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
    },
  };
}

// ------------------------------------------------------------------ studio session (per tab)

export interface StoredSession {
  sessionId: string;
  latestRevision: number;
  jobs: Array<{ id: string; prompt: string | null }>;
}

export function readStoredSession(store: KeyValueStore, userId: string): StoredSession | null {
  const raw = readJson(store, sessionKey(userId));
  if (!isRecord(raw) || !isString(raw.sessionId) || !isFiniteNumber(raw.latestRevision)) {
    return null;
  }
  const jobs = Array.isArray(raw.jobs)
    ? raw.jobs
        .filter((job): job is Record<string, unknown> => isRecord(job) && isString(job.id))
        .slice(-MAX_STORED_JOBS)
        .map((job) => ({ id: String(job.id), prompt: isString(job.prompt) ? job.prompt : null }))
    : [];
  return { sessionId: raw.sessionId, latestRevision: raw.latestRevision, jobs };
}

export function writeStoredSession(store: KeyValueStore, userId: string, session: StoredSession): void {
  writeJson(store, sessionKey(userId), { ...session, jobs: session.jobs.slice(-MAX_STORED_JOBS) });
}

export function clearStoredSession(store: KeyValueStore, userId: string): void {
  removeKey(store, sessionKey(userId));
}
