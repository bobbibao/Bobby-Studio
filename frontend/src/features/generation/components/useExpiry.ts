import { useEffect, useState } from 'react';

const MAX_TIMEOUT_MS = 2_147_000_000;

export function isExpired(expiresAt: string | null, saved: boolean, now: number): boolean {
  if (saved || !expiresAt) {
    return false;
  }
  const time = Date.parse(expiresAt);
  return !Number.isNaN(time) && time <= now;
}

/** True once an unsaved preview's retention window has passed; flips exactly when it expires. */
export function useExpired(expiresAt: string | null, saved: boolean): boolean {
  const [expired, setExpired] = useState(() => isExpired(expiresAt, saved, Date.now()));
  useEffect(() => {
    const now = Date.now();
    setExpired(isExpired(expiresAt, saved, now));
    if (saved || !expiresAt) {
      return undefined;
    }
    const remaining = Date.parse(expiresAt) - now;
    if (Number.isNaN(remaining) || remaining <= 0 || remaining > MAX_TIMEOUT_MS) {
      return undefined;
    }
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [expiresAt, saved]);
  return expired;
}
