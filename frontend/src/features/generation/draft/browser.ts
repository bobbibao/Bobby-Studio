import type { KeyValueStore } from './storage';

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const fallbacks: Record<'local' | 'session', KeyValueStore> = { local: memoryStore(), session: memoryStore() };

/**
 * Browser storage when it is usable; an in-memory store otherwise (private windows, blocked site data).
 * Every caller must still tolerate failures: reads and writes are wrapped in the storage helpers.
 */
export function getBrowserStore(kind: 'local' | 'session'): KeyValueStore {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__bobby_studio_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return fallbacks[kind];
  }
}

const STUDIO_KEY_PREFIX = 'bobby.studio.';

/**
 * Removes studio data (drafts, session pointers) that belongs to any user other than `currentUserId`.
 * A shared device must never restore one account's prompts or sketches for another.
 */
export function purgeOtherUsersStudioData(currentUserId: string): void {
  for (const kind of ['local', 'session'] as const) {
    try {
      const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
      const doomed: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith(STUDIO_KEY_PREFIX) && !key.split('.').includes(currentUserId)) {
          doomed.push(key);
        }
      }
      doomed.forEach((key) => storage.removeItem(key));
    } catch {
      // storage unavailable: nothing to purge
    }
  }
}
