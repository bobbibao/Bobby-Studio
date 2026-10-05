import type { CatalogModel, GenerationQuality, GenerationSize } from '../contracts';
import {
  clearHistory,
  commitStroke,
  createHistory,
  redo,
  toSnapshot,
  undo,
  type StrokeHistory,
} from '../canvas/strokes';
import type { StrokeInput } from '../canvas/types';
import type { StudioInput, StudioMode } from '../scheduler/types';

export interface ReferenceDraft {
  /** Identity of the picked file; upload completions for another key are dropped. */
  key: string;
  status: 'uploading' | 'ready' | 'error';
  assetId: string | null;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  /** Object URL of the local file (never persisted). */
  previewUrl: string | null;
}

export interface DraftState {
  /** Local edit counter used for version-checked draft saves. */
  version: number;
  prompt: string;
  mode: StudioMode;
  modelId: string | null;
  size: GenerationSize | null;
  quality: GenerationQuality;
  history: StrokeHistory;
  reference: ReferenceDraft | null;
  /** The Realtime preference; the scheduler owns the live behavior. */
  auto: boolean;
}

export type DraftAction =
  | { type: 'prompt'; value: string }
  | { type: 'mode'; value: StudioMode }
  | { type: 'model'; model: CatalogModel }
  | { type: 'size'; value: GenerationSize }
  | { type: 'quality'; value: GenerationQuality }
  | { type: 'auto'; value: boolean }
  | { type: 'stroke'; stroke: StrokeInput }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'referencePicked'; reference: ReferenceDraft }
  | { type: 'referenceUploaded'; key: string; assetId: string; width: number | null; height: number | null }
  | { type: 'referencePreview'; key: string; previewUrl: string }
  | { type: 'referenceFailed'; key: string }
  | { type: 'referenceRemoved' };

export function createInitialDraft(overrides: Partial<DraftState> = {}): DraftState {
  return {
    version: 0,
    prompt: '',
    mode: 'prompt',
    modelId: null,
    size: null,
    quality: 'preview',
    history: createHistory(),
    reference: null,
    auto: false,
    ...overrides,
  };
}

export const sameSizeValue = (a: GenerationSize | null, b: GenerationSize | null): boolean =>
  a === b || (a !== null && b !== null && a.width === b.width && a.height === b.height);

/** Picks the size/quality a newly selected model supports, preferring what the user already had. */
export function adaptToModel(state: DraftState, model: CatalogModel): Pick<DraftState, 'modelId' | 'size' | 'quality'> {
  const sizes = model.capabilities.sizes;
  const size = sizes.find((candidate) => sameSizeValue(candidate, state.size)) ?? sizes[0] ?? null;
  const qualities = model.capabilities.qualities;
  const quality = qualities.includes(state.quality) ? state.quality : (qualities.includes('preview') ? 'preview' : qualities[0] ?? state.quality);
  return { modelId: model.id, size, quality };
}

export function reduceDraft(state: DraftState, action: DraftAction): DraftState {
  const next = apply(state, action);
  return next === state ? state : { ...next, version: state.version + 1 };
}

function apply(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'prompt':
      return action.value === state.prompt ? state : { ...state, prompt: action.value };
    case 'mode':
      return action.value === state.mode ? state : { ...state, mode: action.value };
    case 'model': {
      const adapted = adaptToModel(state, action.model);
      return adapted.modelId === state.modelId && sameSizeValue(adapted.size, state.size) && adapted.quality === state.quality
        ? state
        : { ...state, ...adapted };
    }
    case 'size':
      return sameSizeValue(action.value, state.size) ? state : { ...state, size: { width: action.value.width, height: action.value.height } };
    case 'quality':
      return action.value === state.quality ? state : { ...state, quality: action.value };
    case 'auto':
      return action.value === state.auto ? state : { ...state, auto: action.value };
    case 'stroke': {
      const history = commitStroke(state.history, action.stroke);
      return history === state.history ? state : { ...state, history };
    }
    case 'undo': {
      const history = undo(state.history);
      return history === state.history ? state : { ...state, history };
    }
    case 'redo': {
      const history = redo(state.history);
      return history === state.history ? state : { ...state, history };
    }
    case 'clear': {
      const history = clearHistory(state.history);
      return history === state.history ? state : { ...state, history };
    }
    case 'referencePicked':
      return { ...state, mode: 'reference', reference: action.reference };
    case 'referencePreview':
      return state.reference && state.reference.key === action.key && state.reference.previewUrl === null
        ? { ...state, reference: { ...state.reference, previewUrl: action.previewUrl } }
        : state;
    case 'referenceUploaded': {
      // An upload that finishes after the reference was replaced or removed is stale and must not apply.
      if (!state.reference || state.reference.key !== action.key) {
        return state;
      }
      return {
        ...state,
        reference: {
          ...state.reference,
          status: 'ready',
          assetId: action.assetId,
          width: action.width ?? state.reference.width,
          height: action.height ?? state.reference.height,
        },
      };
    }
    case 'referenceFailed': {
      if (!state.reference || state.reference.key !== action.key) {
        return state;
      }
      return { ...state, reference: { ...state.reference, status: 'error', assetId: null } };
    }
    case 'referenceRemoved':
      return state.reference === null ? state : { ...state, reference: null };
    default:
      return state;
  }
}

export function toStudioInput(state: DraftState): StudioInput {
  return {
    prompt: state.prompt,
    mode: state.mode,
    modelId: state.modelId,
    size: state.size,
    quality: state.quality,
    sketch: toSnapshot(state.history),
    reference: state.reference
      ? { key: state.reference.key, assetId: state.reference.assetId, previewUrl: state.reference.previewUrl }
      : null,
  };
}

/** A framework-independent store: components read it with useSyncExternalStore, the scheduler subscribes directly. */
export interface DraftStore {
  getState(): DraftState;
  dispatch(action: DraftAction): void;
  subscribe(listener: () => void): () => void;
}

export function createDraftStore(initial: DraftState): DraftStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reduceDraft(state, action);
      if (next === state) {
        return;
      }
      state = next;
      for (const listener of Array.from(listeners)) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
