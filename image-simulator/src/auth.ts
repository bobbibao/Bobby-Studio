import { createHash, timingSafeEqual } from 'node:crypto';

/** Compares SHA-256 digests so neither length nor content leaks through comparison timing. */
export function keysMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
