import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CatalogModel } from '../contracts';
import { getBrowserStore } from '../draft/browser';
import { createDraftStore, createInitialDraft, type DraftState, type DraftStore } from '../draft/draftState';
import { createDraftWriter, fromStoredDraft, loadDraft } from '../draft/storage';

/** Restores the user's and session's draft (if any) into a fresh store. Scoped by user and session id. */
export function useDraftStore(userId: string, sessionId: string): DraftStore {
  const [store] = useState(() => {
    const stored = loadDraft(getBrowserStore('local'), userId, sessionId);
    return createDraftStore(stored ? fromStoredDraft(stored) : createInitialDraft());
  });
  return store;
}

export function useDraftState(store: DraftStore): DraftState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/**
 * Persists the draft (bounded, version-checked) as the user edits and when the page is hidden or closed.
 * Saving a draft never submits anything.
 */
export function useDraftPersistence(store: DraftStore, userId: string, sessionId: string): void {
  useEffect(() => {
    const writer = createDraftWriter(getBrowserStore('local'), userId, sessionId);
    const unsubscribe = store.subscribe(() => writer.schedule(store.getState()));
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        writer.flush();
      }
    };
    const flush = () => writer.flush();
    if (store.getState().version > 0) {
      writer.schedule(store.getState()); // re-key the draft after a session renewal
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      writer.flush();
    };
  }, [store, userId, sessionId]);
}

/** Makes sure the draft points at a model the catalog knows, adapting size/quality to its capabilities. */
export function useEnsureModel(store: DraftStore, models: readonly CatalogModel[]): void {
  const modelId = useSyncExternalStore(store.subscribe, () => store.getState().modelId, () => store.getState().modelId);
  const size = useSyncExternalStore(store.subscribe, () => store.getState().size, () => store.getState().size);
  useEffect(() => {
    if (models.length === 0) {
      return;
    }
    const current = models.find((model) => model.id === modelId);
    if (current) {
      store.dispatch({ type: 'model', model: current }); // no-op unless size/quality need adapting
      return;
    }
    const fallback = models.find((model) => model.entitled) ?? models[0];
    store.dispatch({ type: 'model', model: fallback });
  }, [store, models, modelId, size]);
}
