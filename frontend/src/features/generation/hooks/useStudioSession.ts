import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrowserStore } from '../draft/browser';
import { readStoredSession, writeStoredSession, type StoredSession } from '../draft/storage';
import type { StudioSessionResponse } from '../contracts';

export interface StudioSessionHandle {
  status: 'loading' | 'ready' | 'error';
  session: StoredSession | null;
  retry(): void;
}

// One in-flight creation per user so a remount cannot create two sessions.
const creating = new Map<string, Promise<StudioSessionResponse>>();

/**
 * One editing session per browser tab: the id is kept in sessionStorage per user and reused when the
 * studio remounts (reload or navigation) so the draft and the session's versions can be restored.
 */
export function useStudioSession(
  userId: string,
  createSession: () => Promise<StudioSessionResponse>
): StudioSessionHandle {
  const [attempt, setAttempt] = useState(0);
  const createRef = useRef(createSession);
  createRef.current = createSession;
  const [state, setState] = useState<{ status: StudioSessionHandle['status']; session: StoredSession | null }>(() => {
    const stored = readStoredSession(getBrowserStore('session'), userId);
    return stored ? { status: 'ready', session: stored } : { status: 'loading', session: null };
  });

  useEffect(() => {
    const store = getBrowserStore('session');
    const stored = readStoredSession(store, userId);
    if (stored) {
      setState({ status: 'ready', session: stored });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', session: null });
    let request = creating.get(userId);
    if (!request) {
      request = createRef.current().finally(() => {
        creating.delete(userId);
      });
      creating.set(userId, request);
    }
    request.then(
      (created) => {
        if (cancelled) {
          return;
        }
        const session: StoredSession = { sessionId: created.id, latestRevision: created.latestRevision, jobs: [] };
        writeStoredSession(store, userId, session);
        setState({ status: 'ready', session });
      },
      () => {
        if (!cancelled) {
          setState({ status: 'error', session: null });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { status: state.status, session: state.session, retry };
}
