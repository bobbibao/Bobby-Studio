import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DraftStore, ReferenceDraft } from '../draft/draftState';
import type { StudioApi } from './types';
import { checkReferenceFile, type ReferenceFileIssue } from './referenceFile';
import type { PreviewUrlRegistry } from './usePreviewUrls';

export interface ReferenceUploadHandle {
  pick(file: File): void;
  remove(): void;
  /** Last client-side validation problem for a rejected file; the current reference is left untouched. */
  issue: ReferenceFileIssue | null;
  clearIssue(): void;
}

/**
 * Picks a reference image, uploads it as an owned asset and tracks it in the draft. Every upload carries
 * the identity (key) of the pick: a completion for a replaced or removed reference is dropped.
 */
export function useReferenceUpload(
  store: DraftStore,
  api: StudioApi,
  previewUrls: PreviewUrlRegistry,
  limits: { maxBytes?: number; mimeTypes?: readonly string[] }
): ReferenceUploadHandle {
  const [issue, setIssue] = useState<ReferenceFileIssue | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  const pick = useCallback(
    (file: File) => {
      const problem = checkReferenceFile(file, limitsRef.current);
      if (problem) {
        setIssue(problem);
        return;
      }
      setIssue(null);
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const key = uuidv4();
      const reference: ReferenceDraft = {
        key,
        status: 'uploading',
        assetId: null,
        name: file.name,
        mimeType: file.type,
        byteSize: file.size,
        width: null,
        height: null,
        previewUrl: previewUrls.create(file), // the original bytes are shown and submitted as-is
      };
      store.dispatch({ type: 'referencePicked', reference });
      apiRef.current.uploadImage(file, controller.signal).then(
        (uploaded) => {
          store.dispatch({ type: 'referenceUploaded', key, assetId: uploaded.assetId, width: uploaded.width, height: uploaded.height });
        },
        () => {
          if (!controller.signal.aborted) {
            store.dispatch({ type: 'referenceFailed', key });
          }
        }
      );
    },
    [store, previewUrls]
  );

  const remove = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIssue(null);
    store.dispatch({ type: 'referenceRemoved' });
  }, [store]);

  // After a reload the draft only holds the owned asset id: fetch the authorized bytes for a preview.
  const restoredKey = useRestoredReferenceKey(store);
  useEffect(() => {
    if (!restoredKey) {
      return undefined;
    }
    const controller = new AbortController();
    apiRef.current.getAssetBlob(restoredKey.assetId, controller.signal).then(
      (blob) => {
        if (blob.type.startsWith('image/')) {
          store.dispatch({ type: 'referencePreview', key: restoredKey.key, previewUrl: previewUrls.create(blob) });
        }
      },
      () => undefined // a missing preview is cosmetic: the reference stays attached
    );
    return () => controller.abort();
  }, [restoredKey, store, previewUrls]);

  return { pick, remove, issue, clearIssue: () => setIssue(null) };
}

function useRestoredReferenceKey(store: DraftStore): { key: string; assetId: string } | null {
  const [value, setValue] = useState<{ key: string; assetId: string } | null>(null);
  useEffect(() => {
    const evaluate = () => {
      const reference = store.getState().reference;
      const next = reference && reference.status === 'ready' && reference.assetId && reference.previewUrl === null
        ? { key: reference.key, assetId: reference.assetId }
        : null;
      setValue((current) => (current?.key === next?.key ? current : next));
    };
    evaluate();
    return store.subscribe(evaluate);
  }, [store]);
  return value;
}
